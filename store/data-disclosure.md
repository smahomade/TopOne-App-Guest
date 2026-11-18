# Store data disclosure — answers to enter

Both stores ask you to declare what the app collects. The answers must match
what the code actually does, or you get rejected (and it counts as a policy
breach if it is wrong later).

These answers were derived from the code: `sign-up.tsx`, `Account.tsx`,
`book.tsx`, and `lib/supabase.ts`. **Re-check them if you add Google sign-in,
push notifications, analytics, or payments** — any of those changes the answers.

Key facts that drive every answer below:

- No advertising SDKs, no analytics SDKs, no tracking.
- No device location, camera, contacts, or photo access.
- Data goes to Supabase (database/auth) and Resend (email) only.
- Account deletion is available in-app at Profile → Delete Account.

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
  submit, or review gets stuck at your login screen.
