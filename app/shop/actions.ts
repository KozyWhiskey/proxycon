'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

interface PurchasePrizeResult {
  success: boolean;
  message?: string;
}

export async function purchasePrize(
  prizeId: string,
  userId: string
): Promise<PurchasePrizeResult> {
  try {
    const supabase = await createClient();

    // Step 1: Fetch prize and user data to validate
    const { data: prize, error: prizeError } = await supabase
      .from('prize_wall')
      .select('id, name, cost, stock')
      .eq('id', prizeId)
      .single();

    if (prizeError || !prize) {
      return { success: false, message: 'Prize not found' };
    }

    const { data: user, error: userError } = await supabase
      .from('players')
      .select('id, tickets')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return { success: false, message: 'User not found' };
    }

    // Step 2: Validate purchase conditions
    if (prize.stock <= 0) {
      return { success: false, message: 'This prize is out of stock' };
    }

    if ((user.tickets || 0) < prize.cost) {
      return {
        success: false,
        message: `Insufficient tickets. You need ${prize.cost} tickets but only have ${user.tickets || 0}`,
      };
    }

    // Step 3: Perform transaction
    // Update prize stock (decrement by 1, but ensure it doesn't go below 0)
    // Use a filter to only update if stock is still positive
    const { error: stockError, data: stockUpdate } = await supabase
      .from('prize_wall')
      .update({ stock: prize.stock - 1 })
      .eq('id', prizeId)
      .gte('stock', 1) // Only update if stock is at least 1
      .select();

    if (stockError || !stockUpdate || stockUpdate.length === 0) {
      return { success: false, message: 'Failed to update stock. The prize may be out of stock.' };
    }

    // Update user tickets
    const newTickets = (user.tickets || 0) - prize.cost;
    const { error: ticketsError } = await supabase
      .from('players')
      .update({ tickets: newTickets })
      .eq('id', userId);

    if (ticketsError) {
      // Rollback: restore stock (best effort)
      await supabase
        .from('prize_wall')
        .update({ stock: prize.stock })
        .eq('id', prizeId);
      
      return { success: false, message: 'Failed to process purchase. Please try again.' };
    }

    // Step 4: Revalidate the shop page
    revalidatePath('/shop');
    revalidatePath('/'); // Also revalidate dashboard to update ticket count

    return { success: true, message: `Successfully purchased ${prize.name}!` };
  } catch (error) {
    console.error('Error in purchasePrize:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

