# Feature: Admin & Polish (V3)

## Objective
Provide tools for system administration and ensure a high-quality user experience.

## Admin Tools
-   **Route:** `/admin` (Hidden/Protected).
-   **Capabilities:**
    -   **Fix Match:** Correct a result entered in error.
    -   **Manage Users:** (Optional) View system users.

## UX/UI Polish
-   **Mobile First:** All tap targets must be thumb-friendly (`h-12`).
-   **Dark Mode:** Permanent slate/dark aesthetic.
-   **Toast Notifications:** Use `sonner` for all success/error feedback.
-   **Loading States:** Use skeletons or spinners for all async actions.

## Technical Maintenance
-   **Database:** Periodically check for orphan records.
-   **Logs:** Monitor server logs for pairing errors.
