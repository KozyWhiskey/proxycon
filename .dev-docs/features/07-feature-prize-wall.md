# Feature: The Prize Wall

## Objective
Create the "shop" where users can spend their hard-earned tickets on prizes. This feature involves displaying available items, handling the purchase logic, and providing visual feedback.

## Implementation Steps

1.  **Create Prize Wall Page (`app/shop/page.tsx`):**
    -   This will be a Server Component.
    -   Fetch all items from the `prize_wall` table.
    -   Fetch the current user's data (specifically their `tickets` count).
    -   Render the items in a grid or masonry layout using Shadcn UI `Card` components.
    -   Each card should display the prize's image, name, and cost (using a `Badge`).

2.  **Create Prize Card Component (`components/shop/prize-card.tsx`):**
    -   This will be a Client Component (`'use client'`).
    -   It takes the prize data and the user's current ticket count as props.
    -   **State Logic:**
        -   If `prize.stock === 0`, the component should be styled as disabled (e.g., grayscale) and display a "SOLD OUT" overlay. The "Buy" button should be hidden.
        -   If `user.tickets < prize.cost`, the "Buy" button should be disabled.
    -   **Interaction:** The "Buy" button will trigger a confirmation dialog.

3.  **Create Confirmation Dialog:**
    -   Use Shadcn's `Dialog` component.
    -   When the "Buy" button is clicked, open a dialog that asks, "Are you sure you want to buy [Prize Name] for [Cost] tickets?".
    -   The dialog will have "Cancel" and "Confirm" buttons.

4.  **Create `purchasePrize` Server Action (`app/shop/actions.ts`):**
    -   This action will be called when the user clicks "Confirm" in the dialog.
    -   It will accept `prizeId` and `userId`.
    -   **Step 1 (Transaction):** This is a critical database transaction. You need to:
        -   Decrement the `stock` of the item in the `prize_wall` table.
        -   Decrement the `tickets` of the user in the `players` table.
        -   It's best to wrap this in a Supabase database function (RPC call) to ensure atomicity. If the user's tickets are not sufficient or the stock is zero, the transaction should fail.
    -   **Step 2 (Feedback):** Return a `{ success: boolean, message: string }` object.

5.  **Integrate Visual Feedback:**
    -   In the `PrizeCard` component, when the `purchasePrize` action is called:
        -   If `success` is true:
            -   Trigger the `canvas-confetti` effect.
            -   Show a success toast from `sonner` (e.g., "Purchase successful!").
            -   Call `revalidatePath('/shop')` to refresh the data on the page.
        -   If `success` is false, show an error toast with the returned message.

## Testing Plan

1.  **Test Prize Wall Display:**
    -   Seed the `prize_wall` table with a few items, some with stock > 0 and one with stock = 0.
    -   Log in as a user with a low number of tickets (e.g., 5).
    -   Navigate to `/shop`.
    -   **Expected Outcome:**
        -   All prizes are displayed in a grid.
        -   The prize with `stock: 0` is grayed out with a "SOLD OUT" message.
        -   The "Buy" button for prizes that cost more than 5 tickets is disabled.
        -   The "Buy" button for affordable prizes is enabled.

2.  **Test Purchase Flow:**
    -   Click the "Buy" button on an affordable, in-stock item.
    -   **Expected Outcome:** A confirmation dialog appears with the correct prize name and cost.

3.  **Test Successful Purchase:**
    -   Confirm the purchase in the dialog.
    -   **Expected Outcome:**
        -   Confetti fires on the screen.
        -   A success toast appears.
        -   The page data reloads. The user's ticket count (displayed somewhere on the page, perhaps in a header) should decrease.
        -   The stock of the purchased item should decrease by 1.
        -   Verify the changes in the `players` and `prize_wall` tables in the database.

4.  **Test Insufficient Funds:**
    -   Try to purchase an item you cannot afford (by manipulating the client-side state to enable the button, or by having two browser windows open).
    -   **Expected Outcome:** The server action should fail, returning `{ success: false }`. An error toast should appear, and the database state should not change.

5.  **Test Out of Stock:**
    -   Try to purchase an item with `stock: 0`.
    -   **Expected Outcome:** The button should be disabled. If you bypass the client-side check, the server action should fail, and the database state should not change.
