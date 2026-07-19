# Setup, Testing & Deployment

## Prerequisites

- Node.js 20+ and npm (only needed for running tests / CI — the app itself has no build step)
- A Firebase project (Auth + Firestore + Storage + Hosting enabled)
- The [Firebase CLI](https://firebase.google.com/docs/cli) if you'll deploy rules/hosting: `npm install -g firebase-tools`

## Run it locally

```bash
git clone <repo>
cd turnflow-mvp
npx serve .          # or any static file server — index.html is the entry point
```

Firebase config lives in `public/js/firebase-config.js`. It's already
populated for the `turnflow-app` Firebase project (Firebase web API keys
are not secrets — they identify the project, not authorize access; actual
access control is enforced by `firestore.rules`, not by hiding this key).
If you stand up your own Firebase project, replace the values there.

### Create test users

1. In the Firebase console → Authentication, create a user per role you want to test (e.g. `pm@test.com`, `tech@test.com`).
2. In Firestore, create a doc at `users/{uid}` (uid from the Auth user) with:
   - `role` — `pm`, `admin`, `tech`, or `client` (required)
   - `email` and/or `name` — optional, but **required in practice for `tech` users** if you want the PM dashboard's technician-assignment dropdown to show something more useful than a raw uid. The client SDK cannot call Firebase Auth's `listUsers()` (that's admin-only), so there is no automatic way to sync the Auth email into this doc — you have to type it in by hand today. See `ARCHITECTURE.md` for the tradeoff.
3. Log in via `index.html` — you'll land on that role's home page (`roleHome()` in `auth.js`).

### Test the client portal

1. Create a `client`-role user as above (steps 1–2).
2. Log in as a `pm`/`admin` user, go to `dashboard.html`, and on any project use the **Client Portal Access** dropdown to assign that client (writes `clientId` on the project).
3. Log in as the client — `pending-approval.html` now shows only that project, read-only, with its status and task list.

Firestore rules enforce this scoping server-side (`clientId == request.auth.uid`) — a client cannot read a project that hasn't been assigned to them, even by guessing/typing a project ID directly against the SDK.

### Seed sample data

`seed.html` creates one sample project assigned to whichever `tech` user is
currently logged in. Log in as a tech user first, then open `seed.html`
directly.

## Run the tests

```bash
npm install
npm test          # single run
npm run test:watch  # watch mode
```

Tests live in `public/js/__tests__/` and cover the dependency-free logic in
`utils.js` (task status derivation, cost calculation, HTML escaping,
login lockout) — 42 tests, no DOM or Firebase mocking required. See
`ARCHITECTURE.md` for why the pure logic was extracted out of `script.js`
to make this possible.

CI (`.github/workflows/ci.yml`) runs the same `npm test` on every push and
PR to `main`. There is currently **no browser/E2E test layer** and **no
Firestore/Storage rules test layer** — see `ROADMAP.md` Phase 0 stretch goals.

## Enable App Check (NFR3)

Login gets two layers of abuse protection:

1. **Client-side lockout** (`auth.js`, always on, no setup needed) — locks
   the login form for 30s after 5 failed attempts for the same email, per
   browser. This only slows down someone repeatedly clicking "Sign in" by
   hand; it does nothing against a script calling Firebase Auth's REST API
   directly.
2. **Firebase App Check** (the real defense, off by default until you
   configure it) — rejects Auth/Firestore/Storage requests that don't come
   with a valid token from this app. The code is already wired up in
   `firebase-config.js` and stays inert (with a console warning) until you
   complete these steps:
   1. Firebase console → **App Check** → register this web app, choosing
      **reCAPTCHA v3** as the provider. This gives you a site key.
   2. Open `public/js/firebase-config.js` and replace
      `RECAPTCHA_V3_SITE_KEY = 'REPLACE_WITH_RECAPTCHA_V3_SITE_KEY'` with
      the real key.
   3. Firebase console → **App Check** → **APIs** tab → set enforcement to
      **Enforced** for Authentication, Cloud Firestore, and Cloud Storage.
      Enforcement is a separate toggle per product — having a site key
      configured does nothing on its own until you flip these.
   4. **Local development:** `localhost` isn't a registered domain, so
      App Check will reject requests from it once enforcement is on.
      Uncomment the `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;` line in
      `firebase-config.js`, open the browser console, copy the debug
      token it logs, and register it under App Check → **Manage debug
      tokens** in the Firebase console. Never leave that line uncommented
      in a deployed environment.

## Deploy

```bash
firebase deploy                          # hosting + firestore rules + storage rules together
firebase deploy --only firestore:rules   # firestore rules only
firebase deploy --only storage           # storage rules only
firebase deploy --only hosting           # hosting only
```

`firebase.json` sets `hosting.public` to `.` (repo root), so all top-level
HTML pages deploy as-is. There is currently one Firebase project and no
dev/staging/prod split — every `firebase deploy` goes to the same
production project referenced in `firebase-config.js`. See `ROADMAP.md`
Phase 3 for environment separation.

## Backup / restore

`backup.html` exports all `projects` docs to a dated JSON file and can
re-import them into a fresh environment. Useful for moving data between a
future dev/staging project and prod once environment separation lands.
