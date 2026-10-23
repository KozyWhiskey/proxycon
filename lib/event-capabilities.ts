/** House operation is independent of player identity and permanent administration. */
export function eventCapabilities(input: { authenticated: boolean; playerId: string | null; house: boolean; admin: boolean; member: boolean }) {
  return {
    joined: Boolean(input.authenticated && input.playerId && input.member),
    canManage: Boolean(input.authenticated && (input.house || input.admin || (input.playerId && input.member))),
    house: Boolean(input.authenticated && input.house),
  };
}
