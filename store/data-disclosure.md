# Store data disclosure — answers to enter

Both stores ask you to declare what the app collects. The answers must match
what the code actually does, or you get rejected (and it counts as a policy
breach if it is wrong later).

These answers were derived from the code: `sign-up.tsx`, `Account.tsx`,
`book.tsx`, `lib/supabase.ts`, and (for Google sign-in, added 18 November
2026) `lib/googleSignIn.ts` and `add-phone.tsx`. **Re-check them if you add
Sign in with Apple, push notifications, analytics, or payments**: any of those
changes the answers.

Key facts that drive every answer below:

- No advertising SDKs, no analytics SDKs, no tracking.
- No device location, camera, contacts, or photo access.
- Data goes to Supabase (database/auth) and Resend (email) only.
- Customers sign in with email and password, or with "Continue with Google"
  (see [Google sign-in](#google-sign-in) below). Both ask for the same data:
  Google users are asked for their phone number once, because Google doesn't
  share it.
- Account deletion is available in-app at Profile → Delete Account.

## Google sign-in

What it adds, and why the answers below barely change:

- **Google passes the app** the customer's name, email address, Google account
  ID, and a link to their Google profile picture. All of it arrives in the ID
  token that Supabase Auth checks.
- **Name, email, phone, user ID:** the same types as an email sign-up, so
  they're already declared.
- **Profile picture link:** Supabase Auth keeps it in the Google identity
  record. The `handle_new_user` database trigger also copies it into
  `profiles.avatar_url`. Neither app shows or uses it. **Before release,
  decide between:**
  - (a) changing the trigger so it stops copying `avatar_url` (one line;
    needs a database change), or
  - (b) declaring it.

  (a) keeps both forms as they are.
- **Nothing goes from the app to Google** apart from the sign-in itself, which
  happens in Google's own account picker. It isn't "sharing" in the stores'
  sense: Google is where the data comes from.
- **Google's SDK:** the app ships Google's sign-in library (Google Play
  services on Android, GoogleSignIn on iOS).
  - Google lists what Play services declares at
    <https://developers.google.com/android/guides/play-data-disclosure>. Check
    it when you fill in the Play form.
  - On iOS, GoogleSignIn ships its own privacy manifest, which App Store
    Connect reads at upload.
- **Apple guideline 4.8:** an iOS app that offers Google sign-in must also
  offer Sign in with Apple (or an equivalent). See
  `docs/google-sign-in-setup.md`. Adding Apple changes these answers again.

---

## Google Play — Data safety form

**Does your app collect or share any of the required user data types?** Yes

### Personal info

| Type | Collected | Shared | Required? | Purpose |
| --- | --- | --- | --- | --- |
| Name | Yes | No | Required | App functionality |
| Email address | Yes | No | Required | App functionality, Account management |
| Phone number | Yes | No | Required | App functionality |
| User IDs | Yes | No | Required | App functionality, Account management |

*(User IDs include the Google account ID for customers who use Google sign-in.)*

### Messages

| Type | Collected | Shared | Required? | Purpose |
| --- | --- | --- | --- | --- |
| Other in-app messages | Yes | No | Required | App functionality |

*(Your enquiry threads — `messages` table.)*

### App activity

Only if you later add analytics. Currently: **nothing to declare.**

### Security practices

- **Is data encrypted in transit?** Yes (HTTPS to Supabase)
- **Can users request data deletion?** Yes — in-app, Profile → Delete Account
- **Have you committed to the Play Families policy?** No (not a children's app)
- **Independent security review?** No

### Data deletion URL

Play wants a **web page** for deletion requests, not just the in-app path.
You need to create one at: **[DELETION REQUEST URL]** — it can be a simple page
saying "delete in-app at Profile → Delete Account, or email us at [EMAIL]".

---

## Apple App Store — Privacy "nutrition label"

In App Store Connect → App Privacy.

**Do you or your third-party partners collect data from this app?** Yes

For each type below, the answers are the same:
- Linked to the user? **Yes** (it is tied to their account)
- Used for tracking? **No**
- Purpose: **App Functionality**

| Category | Type |
| --- | --- |
| Contact Info | Name |
| Contact Info | Email Address |
| Contact Info | Phone Number |
| User Content | Customer Support (your enquiry messages) |
| Identifiers | User ID |

**Do not tick:** Location, Contacts, Health, Financial Info, Browsing History,
Search History, Purchases, Usage Data, Diagnostics, Advertising Data. None of
these apply.

### Account deletion

Apple requires apps with account creation to support in-app deletion. Point the
reviewer at **Profile → Delete Account** in the App Review notes so they do not
have to hunt for it — a reviewer who cannot find it will reject the build.

---

## Both stores also need

- **Privacy policy URL** — publicly reachable, no login. See `privacy-policy.md`.
- **Support URL / contact email.**
- **App Review notes with a working test account** (email and password). Create
  a throwaway account for this and confirm it is email-confirmed before you
  submit, or review gets stuck at your login screen. Reviewers can't use
  your Google account, so the email test account is still needed with Google
  sign-in on.
