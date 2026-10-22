# Weekend guests and profile browsing

Implemented 21 October 2026. Preservation scope: existing accounts, profiles, and decks. Historical games are not required for this migration. Nothing in this feature deletes or rewrites existing games.

## What players see

Signed-in players have a Players navigation item. They can search the playgroup, open a profile, and see its decks and commanders. Emails, auth providers, admin controls, and credentials are not displayed in this directory. Profile/deck editing remains with the owner. Statistics remain scoped to an event.

A weekend guest opens an admin-shared link or QR code, chooses a reserved name, and taps Continue as Scott. Supabase creates an anonymous authenticated session on that phone. A transaction creates the profile, claims the spot, and adds event membership. An unclaimed name cannot enter a game.

Existing email/Google accounts keep their IDs, credentials, profile data, and decks. They are not listed as claimable identities. If a guest name matches an existing profile, the admin sees a warning: adding the name creates a separate guest. Do not use the guest flow to transfer an existing account or its decks.

## Admin workflow

1. Open Administration → Weekend guests.
2. Select an open event.
3. Create its guest link.
4. Add names such as Scott and Taylor.
5. Share the QR code or copy the link.
6. Watch names switch from Ready to claim to Claimed; claimed names link to their new profiles.

The link is valid for 90 days. Replacing it invalidates the old link while keeping all existing spots and claimed phone sessions. Only the hash is stored. A new link's raw token is shown once in the current admin page; after a reload, replace the link to generate a new shareable one.

Claimed phones stay signed in through the normal Supabase refresh session. Claim records survive removal of the event invitation so that removing an invite does not strand an existing guest profile or its decks. A guest cannot claim two spots, take an already claimed spot, or receive an administrator role. Link possession and name confirmation are the intended trust model for this small playgroup; there is no PIN, SMS, email, or identity check for an unclaimed guest name.

## Activate in Supabase

The live project's public auth settings reported **anonymous sign-in disabled** during implementation. No live schema, auth setting, account, or deck changes were made.

1. Verify a recoverable backup of accounts, profiles, and decks, including ownership IDs and auth identities. Retain the existing project.
2. Inspect existing auth user/profile-creation triggers. Anonymous auth users have no email. The app supplies a generated username and the selected display name during signup, but any custom trigger must also handle a null email and default to role user.
3. Review and apply `scripts/sql/weekend_guest_accounts.sql` in the Supabase SQL Editor as the database administrator.
4. Enable **Anonymous Sign-Ins** in Supabase Auth. Reference: https://supabase.com/docs/guides/auth/auth-anonymous
5. Deploy the app with the existing Supabase URL and public key. For house-network hosting, configure `PROXYCON_HOUSE_URL` with the reachable address and port so phones can open the QR link. No service-role key is required or sent to the browser.
6. As the permanent admin, create a test guest list. From a separate phone/browser, claim a test spot, reload, join a game, save a deck, and verify that another phone cannot take that spot.
7. Confirm Craig and Miko each still see their four existing decks and Test Player still sees Harold. Confirm a signed-in player can read another profile and deck list but cannot edit those rows.

The SQL runs in a transaction and is safe to reapply. It adds guest invitation/spot tables and guarded RPC functions. It does not change existing profile or deck primary keys, modify auth users, or update existing deck content.

It also enables RLS for profiles/decks, removes anonymous/public table grants on those tables, allows signed-in profile/deck reading, adds restrictive owner-write policies so old permissive policies cannot override ownership, hides incomplete anonymous signup profiles from other players, and prevents non-admin role changes. Read the policy changes before applying them; other legacy custom code that depended on anonymous table reads will no longer have that access.

The live database's full constraints, auth triggers, and policies were not available through the configured public key. Tests exercise the migration in a local PostgreSQL-compatible runtime, including deliberately broad legacy policies. Staging/live auth verification is still required.

## Browser-session limitation

A no-email guest cannot recover their session after clearing browser data, signing out, or moving to another phone. This implementation does not promise cross-device recovery or offer admin impersonation of an existing account. The guest and admin interfaces state that limitation. Keep the same browser for the weekend. Existing Google/email accounts remain the option for access across devices.

References: Supabase anonymous sign-in documentation above. Supabase supports later identity linking, but identity conversion and account merging are not implemented here.

## Verification

- `npm run test:guest-accounts`: local database preservation, repeat migration, unauthorized admin operations, ownership under legacy permissive policies, guest registration, idempotent retries, competing claims, per-phone claim limit, token rotation, expiry, role protection, rollback after a failed membership, and guest identity surviving invitation deletion.
- Production build and TypeScript checks.
- Scoped ESLint.
- Phone UI review of name selection, claimed-name disabling, and Continue as Scott.
- Player search and desktop admin layout review using temporary local fixtures, removed after verification.

No historical tournament import or destructive game cleanup is part of this change.
