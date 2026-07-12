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
2. In Firestore, create a doc at `users/{uid}` (uid from the Auth user) with a `role` field set to `pm`, `admin`, `tech`, or `client`.
3. Log in via `index.html` — you'll land on that role's home page (`roleHome()` in `auth.js`).

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
`utils.js` (task status derivation, cost calculation, HTML escaping) —
21 tests, no DOM or Firebase mocking required. See `ARCHITECTURE.md` for
why the pure logic was extracted out of `script.js` to make this possible.

CI (`.github/workflows/ci.yml`) runs the same `npm test` on every push and
PR to `main`. There is currently **no browser/E2E test layer** and **no
Firestore rules test layer** — see `ROADMAP.md` Phase 0 stretch goals.

## Deploy

```bash
firebase deploy                          # hosting + firestore rules together
firebase deploy --only firestore:rules   # rules only
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
