# "Continue with Google": setup guide

The app code for Google sign-in is in place. The button stays hidden until the
steps below are done, so nothing changes for customers in the meantime. Only
you can do these steps: they need your Google Cloud, Supabase and Expo
accounts.

You'll end up with:

- three Google OAuth client IDs (web, Android, iOS) and the web client's secret
- the Google provider switched on in Supabase
- two environment variables, in `.env` and on EAS

Supabase project: `unqumatnqfczxpsrbkmz`. App: bundle ID and Android package
`com.topone.app`, EAS project `@linax/aora`.

---

## 1. Google Cloud: project and consent screen

1. Go to <https://console.cloud.google.com/> and create a project (for example
   "TopOne"), or pick an existing one.
2. Open **Google Auth Platform** (<https://console.cloud.google.com/auth/overview>)
   and click **Get started**:
   - **App name**: `TopOne`. Customers see this in Google's account picker.
   - **User support email**: the salon's address.
   - **Audience**: External.
   - **Contact information**: your email.
3. Under **Data Access**, check that the scopes are `openid`, `.../auth/userinfo.email` and
   `.../auth/userinfo.profile`. Add `openid` if it's missing. Don't add more:
   any other scope can trigger Google's app review.
4. Under **Audience**, the app starts in **Testing** mode, where only the
   Google accounts listed as **Test users** can sign in. For UAT, either:
   - add each tester's Gmail address under Test users, or
   - click **Publish app**. With only these three basic scopes, Google doesn't
     review the app first.

   Real customers can't sign in until it's published.
5. Optional: in **Branding**, add the logo and the privacy policy link
   (`https://topone.co.uk/privacy`).

## 2. Find the Android signing fingerprint (SHA-1)

Google only accepts sign-ins from Android builds whose signing certificate it
knows. EAS builds are signed with the keystore EAS keeps for `com.topone.app`.

```bash
npx eas-cli credentials -p android
```

Pick a build profile (development and preview share one keystore unless
you've set them up separately). Under **Keystore**, copy the **SHA1
Fingerprint**.

- **No keystore yet** (no Android EAS build has run): choose **Set up a new
  keystore** there, or let the first `eas build` create one. Then read the
  SHA-1 as above.
- **Later, Google Play**: Play re-signs the app with its own key. When you
  publish, copy the **App signing key certificate** SHA-1 from Play Console →
  *Test and release → Setup → App signing*, and add a second Android client
  for it (step 3).
- **Only if you build locally** with `npx expo run:android`: those builds use
  `android/app/debug.keystore`, which has a different SHA-1. It needs its own
  Android client too:

  ```bash
  keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```

## 3. Google Cloud: create the OAuth clients

In **Google Auth Platform → Clients → Create client**, make three clients:

| Type | Fields | Keep |
|---|---|---|
| **Web application** | Name: `TopOne (Supabase)`. Authorised redirect URI: `https://unqumatnqfczxpsrbkmz.supabase.co/auth/v1/callback` | Client ID **and** client secret |
| **Android** | Package name: `com.topone.app`. SHA-1: from step 2 | Client ID |
| **iOS** | Bundle ID: `com.topone.app`. App Store ID and Team ID can wait until the app is on the App Store | Client ID |

Notes:

- The app sends the **web** client ID to Google, so the sign-in token is made
  out to the web client. That's the one Supabase checks.
- Nothing in the app uses the Android client ID: Google recognises the app by
  its package name and SHA-1.
- The redirect URI on the web client is only used by browser-based sign-in,
  which the app doesn't do. Adding it now saves a trip back later.

## 4. Supabase: switch on the Google provider

Go to **Dashboard → Authentication → Sign In / Providers → Google**:

- **Enable Sign in with Google**: on.
- **Client IDs**: all three IDs, comma-separated, **web first**:
  `WEB_ID,IOS_ID,ANDROID_ID`
- **Client Secret (for OAuth)**: the web client's secret.
- **Skip nonce checks**: **needed for iPhones.**
  - Google's iOS sign-in adds a nonce to the token that the app can't read,
    so Supabase can't check it. Android tokens have no nonce, so Android works
    either way.
  - You can leave it off until iOS testing starts.
  - What you give up: protection against someone replaying a stolen Google
    token. Those tokens expire after an hour, and they only work for your app.
- **Allow users without an email**: off.

Save. Leave the Email provider as it is: email and password keep working.

## 5. Give the app the client IDs

The app reads the IDs from two environment variables. They aren't secrets:
they end up inside the app anyway.

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1234-abc.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=1234-xyz.apps.googleusercontent.com
```

- **Locally:** add them to `.env` in the project folder, next to the Supabase
  values.
- **EAS builds:** `.env` is gitignored, so EAS doesn't upload it. Add both
  variables on expo.dev:
  - **Project → Environment variables**, visibility **Plain text**, for the
    **development**, **preview** and **production** environments.
  - Or use the CLI:

    ```bash
    npx eas-cli env:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value YOUR_WEB_ID --visibility plaintext --environment development --environment preview --environment production
    ```

    Run the same command for `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
  - While you're there, check that `EXPO_PUBLIC_SUPABASE_URL` and
    `EXPO_PUBLIC_SUPABASE_ANON_KEY` are listed too. They're needed for the same
    reason:

    ```bash
    npx eas-cli env:list --environment preview
    ```

The iOS client ID also goes into the iOS build itself: `app.config.js` turns it
into the URL scheme Google's iOS sign-in returns to. If it isn't set, iOS
builds leave Google sign-in out and the button stays hidden on iPhones (see
the Apple note at the end).

## 6. Test it: needs a development or preview build

**Google sign-in doesn't run in Expo Go.** Expo Go doesn't include its native
code, so the button stays hidden there. Email sign-in still works in Expo Go.
To see the button you need a build of the app itself.

| Build | Command | Use it for |
|---|---|---|
| Development build | `npx eas-cli build --profile development --platform android` | Your own testing. Install the APK, then run `npx expo start` and open the project in it. JavaScript changes apply without rebuilding, and so do `.env` edits after restarting `npx expo start`. |
| Preview build | `npx eas-cli build --profile preview --platform android` | UAT testers. It's a standalone app. It's also needed for the `topone://` email links from the UAT review. |

Each build takes a while and uses your EAS build quota, so it's your call when
to start one. Rebuild when a native package changes or the iOS client ID
changes. A preview build also needs a rebuild (or an EAS Update) when the web
client ID changes, because the ID is built into the app's JavaScript.

### Test checklist

1. **New customer, sign-up screen.** Tap **Continue with Google** and pick an
   account. The phone screen appears, saying "Welcome, {first name}!" with the
   Gmail address. Enter a number and tap **Finish signing up**. You land on
   Home.

   In Supabase → Table editor → `profiles`, that row should have:
   - first and last name from Google
   - `username` = the Gmail address
   - the phone number
2. **Saved booking request.** While signed out, pick services and dates. On
   the Messages tab, tap **Sign In To Send Request**, then use Google.

   After the phone step you land on Messages and the request is sent, with
   the Google name in it.
3. **Returning Google customer.** Sign out and sign in with Google again. The
   phone screen doesn't appear.
4. **Profile tab.** Sign out. On the Profile tab, use Google in both "Sign in"
   and "Sign Up" mode. You stay on Profile, now signed in.
5. **Existing email customer** with the same Gmail address: Google sign-in
   opens their existing account (same name, phone and messages), with no phone
   screen.
6. **Cancel** the Google account picker: nothing happens, and you can still
   sign in with email.
7. **Email and password** sign-in and sign-up still work as before.
8. **Phone screen exits.** The back button and swipe-back are blocked on the
   phone screen. "Use a different account" signs out.
9. **Closed on the phone screen.** Sign in with a new Google account, then
   close the app on the phone screen without adding a number. Open the app
   again: it goes straight back to the phone screen, still signed in. Opening
   any tab does the same until a number is saved.

If Android says *"Google sign-in isn't set up for this build of the app
yet"*, Google doesn't know the build's SHA-1. Check step 2 against the
keystore that signed that build.

## Good to know

- **Same email, same account.** Supabase links a Google sign-in to an existing
  account with the same email. If that account never confirmed its email,
  Supabase drops the unconfirmed sign-up first, so nobody can claim an address
  they don't own. The phone number from the sign-up form is kept.
- **Password for a Google customer:** if one wants to sign in with a password
  later, **Forgot Password?** on the sign-in screen lets them set one.
- **Switching accounts:** the app signs out of Google straight after
  sign-in. The account picker shows every time, so someone else on the same
  phone can pick their own account.
- **Profile picture link:** Google sends a link to the profile picture, and
  the `handle_new_user` trigger copies it into `profiles.avatar_url`. Nothing
  uses it. See `store/data-disclosure.md` for the decision this needs before
  release.
- **Privacy policy:** `store/privacy-policy.md` and `.html` now mention Google
  sign-in. Paste the new HTML into topone.co.uk/privacy when Google sign-in
  goes live.

## Follow-up before the iOS release: Sign in with Apple (guideline 4.8)

App Store Review Guideline 4.8 (Login Services): an app that lets people set
up or sign in to their main account with a third-party service, such as
Google, must also offer an equivalent option that:

- only collects name and email
- lets people keep their email private
- doesn't track them without consent

Sign in with Apple is the usual way to meet it.

The iOS release is on hold, so this is left for later:

- **Until Apple sign-in exists,** leave `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
  unset for iOS builds. The Google button then doesn't appear on iPhones, and
  an iOS build doesn't break 4.8. Android is unaffected.
- **When the iOS release resumes,** adding it means:
  - **Package:** `expo-apple-authentication` and its config plugin, a "Sign in
    with Apple" button, and
    `supabase.auth.signInWithIdToken({ provider: 'apple', token, nonce })`.
  - **Profile:** Apple, unlike Google, can take a nonce. It also only gives
    the name on the very first sign-in, so save it to `profiles` then.
  - **Phone step:** reuse the existing add-phone screen.
  - **Apple Developer:** turn on the Sign in with Apple capability for
    `com.topone.app`.
  - **Supabase:** switch on the Apple provider with the bundle ID as client ID.
  - **Hidden emails:** "Hide My Email" gives relay addresses. For the Resend
    emails (confirmations, password resets) to reach them, register the
    sending domain with Apple's private email relay service.
  - **Docs:** update `store/data-disclosure.md` and the privacy policy again.

## What changed in the code

| File | Change |
|---|---|
| `lib/googleSignIn.ts` | Loads the Google library only in real builds (it crashes Expo Go otherwise), signs in with the ID token, and fills the profile's names and username. Also holds the hand-off to the Messages tab. |
| `components/GoogleSignInButton.tsx` | The button, with the "or" divider and error pop-up. Shown on `app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx` and `components/Auth.tsx`. |
| `app/(auth)/add-phone.tsx` | The one-time phone number screen. |
| `lib/pendingBooking.ts` | Holds a saved booking request until the Google customer's name and phone are in the profile, so it isn't sent under a blank name. |
| `app.config.js` | Adds the Google sign-in config plugin with the iOS URL scheme, when the iOS client ID is set. |
| `package.json` | Adds `@react-native-google-signin/google-signin` 17 and `react-native-svg` (for Google's "G" logo). |
