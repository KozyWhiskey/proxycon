# Feature: Auth & Onboarding (V3)

## Objective
Establish a secure, persistent identity for users using Supabase Auth and a custom `profiles` table. Solve the "New Player" issue by enforcing an onboarding flow.

## Architecture
-   **Auth Provider:** Supabase Auth (Email/Password, OAuth).
-   **Identity Table:** `public.profiles` (linked 1:1 with `auth.users`).
-   **Onboarding:** Users without a `username` are redirected to `/onboarding`.

## Key Components
1.  **Login Page (`app/login/page.tsx`):** Standard Supabase Auth form.
2.  **Onboarding Page (`app/onboarding/page.tsx`):** Forced redirect for new users. Collects:
    -   Username (@handle)
    -   Display Name (Real Name/Nickname)
    -   Favorite Card (Flavor)
3.  **Middleware (`utils/supabase/middleware.ts`):** Handles session refresh.
4.  **Profile Actions (`app/onboarding/actions.ts`):** Creates the profile record.

## Best Practices
-   **Always** fetch user data via `getCurrentUser()` or `supabase.auth.getUser()`.
-   **Never** rely on legacy `players` table; it has been removed.
-   Use `profiles.display_name` for UI rendering.
