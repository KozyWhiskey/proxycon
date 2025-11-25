# Feature: The Ledger

## Objective
Build a simple expense tracking system for the group. Users can log expenses they've paid for, and the app will calculate each person's share and current balance.

## Implementation Steps

1.  **Create Ledger Page (`app/ledger/page.tsx`):**
    -   This will be a Server Component that fetches all data from the `ledger` table and the list of all `players`.
    -   The page will be split into two main sections: a summary card and an expense logging form.

2.  **Build Summary Component:**
    -   Create a component to display the calculated summary.
    -   **Total Pot:** Calculate the sum of the `amount` of all entries in the `ledger` table.
    -   **Per-Person Share:** Calculate `Total Pot / Number of Players`.
    -   **Personal Balance:** For the logged-in user, calculate `(Total Amount They Paid) - (Per-Person Share)`.
    -   Display the user's balance with conditional styling: green for a positive balance (they are "up") and red for a negative balance (they "owe").

3.  **Build Expense Form Component:**
    -   Create a Client Component (`'use client'`) for the form.
    -   **Payer:** A `<Select>` dropdown populated with all player names. This defaults to the currently logged-in user.
    -   **Amount:** An `<Input type="number" />` for the expense amount.
    -   **Description:** An `<Input type="text" />` for what the expense was for (e.g., "Beer run", "Pizza").
    -   **Submit Button:** A button to call the server action.

4.  **Create `logExpense` Server Action (`app/ledger/actions.ts`):**
    -   This action is called when the expense form is submitted.
    -   It takes `payerId`, `amount`, and `description`.
    -   It creates a new entry in the `ledger` table with the provided data.
    -   After successfully creating the entry, it should `revalidatePath('/ledger')` to ensure the summary and list of expenses are updated.
    -   Return a success/error message to be shown as a toast.

5.  **Build Expense List Component:**
    -   Below the form, display a list or table of all expenses already logged.
    -   Each entry should show the description, amount, and who paid.

## Testing Plan

1.  **Test Initial Display:**
    -   Navigate to `/ledger` with an empty `ledger` table.
    -   **Expected Outcome:**
        -   The summary should show $0 for all values.
        -   The expense form should be visible.
        -   The list of expenses should be empty.

2.  **Test Logging an Expense:**
    -   Log in as "Dave".
    -   Go to the ledger page. The "Payer" dropdown should default to "Dave".
    -   Enter an amount (e.g., 50) and a description (e.g., "Snacks").
    -   Click "Submit".
    -   **Expected Outcome:**
        -   A success toast appears.
        -   The page reloads/revalidates.
        -   The new expense appears in the list.
        -   The summary is updated. Assuming 10 players, the Total Pot is $50, the share is $5, and Dave's balance is +$45.00 (green).

3.  **Test Balance Calculation:**
    -   Log in as "Steve".
    -   Go to the ledger page.
    -   **Expected Outcome:** The summary for Steve should show his balance as -$5.00 (red).
    -   Now, have Steve log an expense of $10.
    -   **Expected Outcome:** The page updates. The Total Pot is now $60, the share is $6. Steve has paid $10, so his new balance is +$4.00 (green). Dave's balance is now +$44.00 (green).

4.  **Test Form Validation:**
    -   Try to submit the form with an invalid amount (e.g., text, or a negative number).
    -   **Expected Outcome:** Use `zod` for validation. The form should show an error message, and the server action should not be called.
