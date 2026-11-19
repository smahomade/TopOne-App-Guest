import { Platform, TurboModuleRegistry } from 'react-native';
import { router } from 'expo-router';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { holdPendingBooking, releasePendingBooking, takePendingBooking } from './pendingBooking';

// "Continue with Google": the phone's own Google account picker returns an ID
// token, and Supabase signs the customer in with it. There's no browser
// redirect and no password or email confirmation. Setup steps (Google Cloud
// client IDs, the Supabase provider) are in docs/google-sign-in-setup.md.

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');
type GoogleProfile = import('@react-native-google-signin/google-signin').User['user'];

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

// Android's "DEVELOPER_ERROR": Google doesn't recognise this build's signing
// certificate (its SHA-1 isn't on the Android OAuth client).
const ANDROID_DEVELOPER_ERROR = '10';

let loadedModule: GoogleSignInModule | null | undefined;

// The package's native code isn't in Expo Go, and importing it there throws
// at once. So it's only loaded when the native module exists (a development,
// preview or store build) and the client IDs are set.
function loadGoogleSignIn(): GoogleSignInModule | null {
	if (loadedModule !== undefined) {
		return loadedModule;
	}

	const hasClientIds =
		(Platform.OS === 'android' && Boolean(webClientId)) ||
		(Platform.OS === 'ios' && Boolean(webClientId && iosClientId));

	if (!hasClientIds || TurboModuleRegistry.get('RNGoogleSignin') == null) {
		loadedModule = null;
		return loadedModule;
	}

	const googleSignIn: GoogleSignInModule = require('@react-native-google-signin/google-signin');
	// webClientId sets the ID token's audience to the web client, which is the
	// one Supabase checks first.
	googleSignIn.GoogleSignin.configure({ webClientId, iosClientId });
	loadedModule = googleSignIn;
	return loadedModule;
}

/** False in Expo Go, on the web, and when the client IDs aren't set; the button hides itself then. */
export function isGoogleSignInAvailable(): boolean {
	return loadGoogleSignIn() !== null;
}

export type GoogleSignInResult =
	| { status: 'cancelled' }
	| { status: 'signed-in'; needsPhone: boolean };

/**
 * Signs in with Google and fills in the profile from the Google account.
 * `needsPhone` means the profile has no phone number yet: show the add-phone
 * screen, which then sends any saved booking request. Otherwise call
 * `continueAfterSignIn`.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
	const googleSignIn = loadGoogleSignIn();

	if (!googleSignIn) {
		throw new Error("Google sign-in isn't available in this version of the app. Please sign in with your email.");
	}

	const { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } = googleSignIn;
	let googleProfile: GoogleProfile;
	let idToken: string | null;

	try {
		await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
		const response = await GoogleSignin.signIn();

		if (isCancelledResponse(response)) {
			return { status: 'cancelled' };
		}

		({ user: googleProfile, idToken } = response.data);
	} catch (error) {
		if (isErrorWithCode(error)) {
			if (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS) {
				return { status: 'cancelled' };
			}

			if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
				throw new Error('Google Play services is missing or out of date on this phone. Update it, or sign in with your email instead.');
			}

			if (error.code === ANDROID_DEVELOPER_ERROR) {
				throw new Error("Google sign-in isn't set up for this build of the app yet. Please sign in with your email for now.");
			}
		}

		throw error;
	} finally {
		// The app only needs the ID token. Leaving Google signed in would skip
		// the account picker next time, so someone else on this phone couldn't
		// choose their own account.
		GoogleSignin.signOut().catch(() => {});
	}

	if (!idToken) {
		throw new Error("Google didn't send back a sign-in token. Please try again.");
	}

	// Hold a saved booking request until the name (and phone, if needed) is in
	// the profile, so it doesn't go out under a blank name.
	holdPendingBooking();
	let needsPhone = false;

	try {
		const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });

		if (error) {
			throw error;
		}

		needsPhone = await fillProfileFromGoogle(data.user, googleProfile);
		return { status: 'signed-in', needsPhone };
	} finally {
		// With a phone step to come, the add-phone screen releases it instead.
		if (!needsPhone) {
			releasePendingBooking();
		}
	}
}

/**
 * Fills the gaps in the customer's profile row the way sign-up does: first and
 * last name, and the email as username. Names already there aren't changed,
 * which matters when the Google account joins an existing email account.
 * Returns true when the row has no phone number.
 */
async function fillProfileFromGoogle(user: User, google: GoogleProfile): Promise<boolean> {
	// A database trigger (handle_new_user) creates the row when the account is
	// created, but with no name, phone or username for a Google account.
	const { data: profile, error: readError } = await supabase
		.from('profiles')
		.select('first_name, last_name, phone_number, username')
		.eq('id', user.id)
		.maybeSingle();

	if (readError) {
		// Can't tell what's missing. Asking for the phone is harmless: that
		// screen saves it either way.
		console.warn('Could not read the profile after Google sign-in:', readError.message);
		return true;
	}

	const email = (user.email ?? google.email).trim().toLowerCase();
	const [nameFirstWord = '', ...nameOtherWords] = (google.name ?? '').trim().split(/\s+/);
	const firstName = google.givenName?.trim() || nameFirstWord;
	const lastName = google.familyName?.trim() || nameOtherWords.join(' ');

	const updates: { first_name?: string; last_name?: string; username?: string } = {};

	if (!profile?.first_name?.trim() && firstName) {
		updates.first_name = firstName;
	}

	if (!profile?.last_name?.trim() && lastName) {
		updates.last_name = lastName;
	}

	// profiles.username must be unique and at least 3 characters.
	if (!profile?.username?.trim() && email.length >= 3) {
		updates.username = email;
	}

	if (profile && Object.keys(updates).length === 0) {
		return !profile.phone_number?.trim();
	}

	let { error: saveError } = await supabase
		.from('profiles')
		.upsert({ id: user.id, ...updates, updated_at: new Date() });

	// Another account already has this email as its username (it changed
	// email). Save the name without it rather than fail.
	if (saveError?.code === '23505' && updates.username) {
		const { username: _taken, ...withoutUsername } = updates;
		({ error: saveError } = await supabase
			.from('profiles')
			.upsert({ id: user.id, ...withoutUsername, updated_at: new Date() }));
	}

	if (saveError) {
		console.warn('Could not save the Google name to the profile:', saveError.message);
	} else if (updates.first_name || updates.last_name) {
		// Same metadata as an email sign-up. Updating the user also sends an auth
		// event, which makes the Messages and Profile tabs (already mounted, and
		// they read the profile when the session started) read the new name.
		await supabase.auth.updateUser({
			data: { first_name: updates.first_name ?? profile?.first_name, last_name: updates.last_name ?? profile?.last_name },
		});
	}

	return !profile?.phone_number?.trim();
}

/** Saves the number from the add-phone screen. */
export async function savePhoneNumber(phoneNumber: string): Promise<void> {
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		throw new Error('You were signed out. Please sign in again.');
	}

	const { error } = await supabase
		.from('profiles')
		.upsert({ id: session.user.id, phone_number: phoneNumber, updated_at: new Date() });

	if (error) {
		throw error;
	}

	// Same metadata as an email sign-up; the auth event refreshes the Profile tab.
	await supabase.auth.updateUser({ data: { phone_number: phoneNumber } });
}

/**
 * After sign-in is finished: sends a booking request saved before sign-in (as
 * sign-in.tsx does), otherwise goes to `fallback`, or stays put if it's null.
 * Returns true when it went to send a booking request.
 */
export async function continueAfterSignIn(fallback: '/home' | null): Promise<boolean> {
	releasePendingBooking();
	const pending = await takePendingBooking();

	if (pending) {
		// With the request in the route params, the Messages tab sends it even if
		// it's already open (it only checks for a saved request when the session
		// changes).
		router.replace({ pathname: '/book', params: pending });
		return true;
	}

	if (fallback) {
		router.replace(fallback);
	}

	return false;
}
