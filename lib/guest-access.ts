import { z } from 'zod';

export const guestToken = z.string().regex(/^[a-f0-9]{64}$/);
export const guestName = z.string().trim().min(1, 'Enter a play name.').max(60, 'Keep the play name to 60 characters.');
export const guestInvitationSchema = z.object({
  eventId: z.uuid(),
  eventName: z.string(),
  spots: z.array(z.object({ id: z.uuid(), name: z.string(), claimed: z.boolean() })),
});
export type GuestInvitation = z.infer<typeof guestInvitationSchema>;
