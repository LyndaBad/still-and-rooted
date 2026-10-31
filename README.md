# Still & Rooted
Personal Bible study app with Supabase Auth and private cloud reflections.

## Deployment status
Source prepared for LyndaBad/still-and-rooted. Supabase project, database migration, and hosting are not yet provisioned. Cloud sign-in stays disabled until configured.

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
