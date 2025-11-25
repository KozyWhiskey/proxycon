# Prize Wall - Implementation Documentation

**Status:** ✅ **COMPLETED**  
**Route:** `/shop`  
**Feature Spec:** `.dev-docs/features/07-feature-prize-wall.md`

---

## Overview

The Prize Wall feature provides a shop interface where users can spend their tickets on prizes. It includes inventory management, purchase validation, transaction safety, and visual feedback for purchases.

## Implementation Details

### Files Created

1. **`app/shop/page.tsx`** - Server Component
   - Fetches all prizes from `prize_wall` table
   - Fetches current user data
   - Displays ticket balance
   - Renders prize grid

2. **`components/shop/prize-card.tsx`** - Client Component
   - Individual prize card with image, name, cost
   - Purchase button with validation
   - Confirmation dialog
   - Confetti animation on success
   - Toast notifications

3. **`app/shop/actions.ts`** - Server Action
   - `purchasePrize()` - Handles purchase transaction

### Key Features

#### Prize Display
- Responsive grid layout:
  - 1 column on mobile
  - 2 columns on tablet
  - 3 columns on desktop
- Each card displays:
  - Prize image (if available)
  - Prize name
  - Cost badge (yellow accent)
  - Stock status

#### Purchase Validation

**Client-Side:**
- "Buy" button disabled if:
  - Prize is out of stock (`stock <= 0`)
  - User has insufficient tickets (`userTickets < prize.cost`)
- Shows "SOLD OUT" badge when stock is 0
- Shows "Need X more tickets" when user can't afford

**Server-Side:**
- Validates prize exists
- Validates prize is in stock
- Validates user has sufficient tickets
- Uses safety check to prevent negative stock

#### Transaction Safety

The purchase process uses a two-step transaction with rollback:

1. **Update Prize Stock:**
   - Decrements stock by 1
   - Uses `.gte('stock', 1)` filter to prevent negative stock
   - Only updates if stock is at least 1

2. **Update User Tickets:**
   - Decrements user tickets by prize cost
   - If this fails, attempts rollback of stock

**Note:** For production, consider implementing a Supabase RPC function for true atomicity, but the current implementation provides good safety with the stock filter.

#### Visual Feedback

**On Successful Purchase:**
- Confetti animation using `canvas-confetti`
- Success toast notification
- Page refresh to show updated data
- Ticket balance updates

**On Error:**
- Error toast with specific message
- No database changes
- User can retry

### Database Operations

1. **Prize Stock Update:**
   ```sql
   UPDATE prize_wall 
   SET stock = stock - 1 
   WHERE id = prizeId AND stock >= 1
   ```

2. **User Ticket Update:**
   ```sql
   UPDATE players 
   SET tickets = tickets - cost 
   WHERE id = userId
   ```

3. **Revalidation:**
   - Revalidates `/shop` page
   - Revalidates `/` (dashboard) to update ticket display

### User Experience

- **Mobile-First Design:** Large touch targets, responsive grid
- **Visual States:**
  - Out of stock: Grayscale filter, "SOLD OUT" badge
  - Can't afford: Disabled button with helpful message
  - Can purchase: Enabled yellow "Buy" button
- **Confirmation Dialog:** Prevents accidental purchases
- **Immediate Feedback:** Confetti and toast on success
- **Ticket Balance Display:** Shows current tickets at top of page

### Error Handling

The server action handles several error cases:

- Prize not found
- User not found
- Out of stock
- Insufficient tickets
- Transaction failures

All errors return user-friendly messages via toast notifications.

### Testing Checklist

- ✅ Prize wall displays all prizes
- ✅ Out of stock prizes show "SOLD OUT"
- ✅ Buy button disabled when insufficient tickets
- ✅ Buy button enabled when user can afford
- ✅ Confirmation dialog appears on click
- ✅ Confetti fires on successful purchase
- ✅ Success toast appears
- ✅ Ticket balance updates
- ✅ Prize stock decreases
- ✅ Page refreshes with updated data
- ✅ Error handling for insufficient funds
- ✅ Error handling for out of stock
- ✅ Transaction rollback on failure

### Known Considerations

- The current implementation uses sequential updates rather than a true database transaction. For high-concurrency scenarios, consider implementing a Supabase RPC function that uses PostgreSQL transactions for true atomicity.
- The stock update uses a filter to prevent negative values, which provides good safety but may not prevent all race conditions in extreme scenarios.

---

## Usage

1. Navigate to `/shop`
2. View current ticket balance at top
3. Browse available prizes in grid
4. Click "Buy" on an affordable, in-stock prize
5. Confirm purchase in dialog
6. Enjoy confetti and success message
7. See updated ticket balance and prize stock

## Prize Management

Prizes are managed in the `prize_wall` table:
- `name` - Prize name
- `cost` - Ticket cost (integer)
- `stock` - Available quantity (integer, default 0)
- `image_url` - Optional image URL
- `created_at` / `updated_at` - Timestamps

To add prizes, insert directly into the database or create an admin interface (future feature).

