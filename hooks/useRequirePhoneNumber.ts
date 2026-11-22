import { useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';

import { supabase } from '@/lib/supabase';

// The salon needs a phone number to confirm bookings. Google doesn't share one,
// so a Google sign-in asks for it on the add-phone screen straight away. But
// the account exists as soon as Google says yes, so a customer who closes the
// app on that screen is still signed in next time, with no number. This sends
// a signed-in customer with no number back to add-phone whenever the screen
// using it comes into view. It runs on focus only, not on sign-in events, so it
// doesn't race the Google sign-in, which opens add-phone itself.

type HowToOpen = 'push' | 'replace';

/**
 * `push` keeps the current screen underneath (the welcome screen, as the
 * sign-in flow does); `replace` swaps it out (the tabs, so finishing on
 * add-phone doesn't leave a second copy of them behind).
 */
export function useRequirePhoneNumber(howToOpen: HowToOpen) {
	useFocusEffect(
		useCallback(() => {
			let active = true;

			void (async () => {
				const {
					data: { session },
				} = await supabase.auth.getSession();

				if (!active || !session) {
					return;
				}

				const { data: profile, error } = await supabase
					.from('profiles')
					.select('phone_number')
					.eq('id', session.user.id)
					.maybeSingle();

				// If the profile can't be read (offline, say), carry on rather than
				// lock the customer out of the app.
				if (!active || error) {
					return;
				}

				if (!profile?.phone_number?.trim()) {
					router[howToOpen]('/add-phone');
				}
			})();

			return () => {
				active = false;
			};
		}, [howToOpen])
	);
}
