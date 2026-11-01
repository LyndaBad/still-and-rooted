# Still & Rooted
Personal Bible study app with Supabase Auth and private cloud reflections.

## Deployment status
GitHub source is in LyndaBad/still-and-rooted. Supabase project yphzzfbcoqzfckjlfhjz is on the Free plan in the owner-only Still and Rooted Personal organization. The schema and RLS policies are installed. Project URL and public key are configured. Authentication is prepared for https://lyndabad.github.io/still-and-rooted/.

Hosting is not enabled yet: GitHub Pages on this account requires a public repository. User approval for that visibility change is pending. A real browser sign-in and two-device save test remain required after publication.

## Verified
- Database owner read/update succeeds; cross-account read/update/insert and anonymous read are blocked. Transactional test fixtures were rolled back.
- Cloud adapter tests passed for load/save, offline retry, explicit local-note import, blocked sign-out with unsynced drafts, and separation of guest/cloud notes.

## Free setup
1. Create a free Supabase organization/project (do not select Pro or add billing).
2. Run schema.sql in its SQL editor.
3. Put the project URL and publishable (or legacy anon) key in config.js. Never publish the service-role key or database password.
4. Configure Authentication Site URL and redirect allowlist with the exact HTTPS deployment origin/path.
5. Enable email login. Supabase's default email sender restricts recipients; use the account owner's verified team email for initial testing. General multi-user access would require separately configured SMTP.
6. Publish this folder to a static HTTPS host. GitHub Pages requires a compatible repository/plan; no paid plan is authorized.
7. Sign in with email link and test a reflection on two browsers. Verify anonymous requests cannot read records and a second user cannot read or write another user's entries.

## Storage and privacy
Each reflection, completion and bookmark has its own row keyed to auth.uid(). Row-level security isolates each account. Drafts are cached in browser storage under the account ID. Existing local-only notes are not automatically uploaded; use the explicit import button after signing in. Different entries merge. Concurrent edits to the same entry use the last successful write. Do not edit the same reflection simultaneously on two devices.

## Safety
Do not enter real reflections until the database access tests pass. Free projects can pause after inactivity. No credit card, paid upgrade, service-role browser secret, analytics, or third-party tracking is required.
