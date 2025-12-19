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
3.  **Auth Proxy (`proxy.ts`):** The root entry point (formerly middleware) that refreshes Supabase sessions.
4.  **Middleware Logic (`utils/supabase/middleware.ts`):** Helper function used by the root proxy to handle token rotation and session persistence.
5.  **Auth Helpers (`lib/get-current-user.ts`):** Server-side utilities (`getCurrentUser`, `requireProfile`) for fetching data and enforcing access control.

## Best Practices
-   **Session Refresh:** The root `proxy.ts` must be present to prevent random logouts by refreshing the access token server-side.
-   **Secure Verification:** Always use `supabase.auth.getUser()` on the server to verify the user's identity; never trust session data alone as it can be spoofed.
-   **Route Protection:** Use the `requireProfile()` helper in Server Components to automatically redirect unauthenticated users to `/login` and new users to `/onboarding`.
-   **Identity Source:** Use `profiles.display_name` for all UI rendering to ensure a consistent global identity.
-   **Client vs Server:** Use `utils/supabase/server.ts` for Server Components/Actions and `utils/supabase/client.ts` for Client Components.
