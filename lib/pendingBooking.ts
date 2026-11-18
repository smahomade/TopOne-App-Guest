import AsyncStorage from '@react-native-async-storage/async-storage';

// A booking request a guest put together before signing in. It's kept on the
// phone so it survives the sign-in (and sign-up plus email confirmation) and
// is sent once they're signed in, instead of being lost at the sign-in wall.

const STORAGE_KEY = 'pendingBookingRequest';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type PendingBooking = {
	bookingKey: string;
	bookingServices: string;
	bookingDates: string;
};

export async function savePendingBooking(booking: PendingBooking): Promise<void> {
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...booking, savedAt: Date.now() }));
}

async function readPendingBooking(): Promise<PendingBooking | null> {
	const raw = await AsyncStorage.getItem(STORAGE_KEY);

	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw);
		const isValid =
			typeof parsed?.bookingKey === 'string' &&
			typeof parsed?.bookingServices === 'string' &&
			typeof parsed?.bookingDates === 'string' &&
			typeof parsed?.savedAt === 'number' &&
			Date.now() - parsed.savedAt <= MAX_AGE_MS;

		if (!isValid) {
			await AsyncStorage.removeItem(STORAGE_KEY);
			return null;
		}

		return {
			bookingKey: parsed.bookingKey,
			bookingServices: parsed.bookingServices,
			bookingDates: parsed.bookingDates,
		};
	} catch {
		await AsyncStorage.removeItem(STORAGE_KEY);
		return null;
	}
}

export async function hasPendingBooking(): Promise<boolean> {
	return (await readPendingBooking()) !== null;
}

/** Called when a request starts sending, so a saved copy isn't sent again. */
export async function clearPendingBooking(): Promise<void> {
	await AsyncStorage.removeItem(STORAGE_KEY);
}

/** Returns the saved request and removes it, so it's only sent once. */
export async function takePendingBooking(): Promise<PendingBooking | null> {
	const booking = await readPendingBooking();

	if (booking) {
		await AsyncStorage.removeItem(STORAGE_KEY);
	}

	return booking;
}
