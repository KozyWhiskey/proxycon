# Trophy & Badge System: "The Director's Cut"

**Last Updated:** December 29, 2025
**Status:** Active
**System:** AI-Gamification V3.1

---

## 1. Philosophy: Badges of Honor

The Upkeep Trophy system is designed to make achievements meaningful. Instead of participation awards, Trophies (a decorated form of Badges) are awarded for significant accomplishments, creating a "Trophy Case" that players are proud to display.

The system is powered by our AI, "The Snarky Director," who observes gameplay and generates unique, flavorful, and often humorous awards, ensuring the Trophy Case is a personalized record of a player's career highlights.

---

## 2. Rarity Tiers & Visuals

To distinguish between different levels of achievement, all Trophies are assigned a rarity, mirroring the card rarities in Magic: The Gathering. This rarity is visually represented by a colored, glowing border in the Trophy Case UI.

| Rarity | Color | Border Style | Example Use Case |
|---|---|---|---|
| **Mythic** | Orange-Red | `border-orange-500` | Winning a Draft tournament (1st Place). |
| **Rare** | Gold | `border-amber-400` | First-time win with a Commander. |
| **Uncommon** | Silver/Blue | `border-blue-400` | Placing 3rd in a Draft tournament. |
| **Common** | Gray | `border-zinc-500` | Basic milestone badges (e.g., 'Hot Hand'). |

---

## 3. How Trophies Are Awarded

Trophies are awarded based on specific triggers across different game modes.

### A. Tournament Trophies (Limited Format)

These are the most prestigious Trophies, awarded **only** at the conclusion of a Draft or Sealed tournament.

- **Trigger:** `generateNextRound` action marks a tournament `status` as `'completed'`.
- **Logic:** The system calculates the final standings and awards AI-generated Trophies to the Top 3 players.
- **Rarity Mapping:**
  - **1st Place:** 🥇 Mythic Trophy
  - **2nd Place:** 🥈 Rare Trophy
  - **3rd Place:** 🥉 Uncommon Trophy
- **Content:** The AI Director generates a unique badge for each rank based on the tournament's **Expansion Set**. For example, winning a *Bloomburrow* draft might award the "Apex Predator" Trophy, while placing 3rd might award the "Humble Forager" Trophy. Each of these will have a different name, description, and rarity.

### B. Commander Trophies (Constructed & Casual)

These Trophies celebrate a player's mastery over their chosen decks.

- **Trigger:** A player wins a match (Tournament or Casual) for the **first time ever** with a specific Commander.
- **Logic:** `checkAndAwardCommanderBadge` is called. If no badge exists for that Commander, it prompts the AI Director to create a "roast" or celebratory badge. This badge then enters the global pool and can be earned by other players.
- **Rarity Mapping:** All Commander Trophies are designated as **Rare**.

### C. Unique Feats ("God Mode" Moments)

These are for truly unique, one-off gameplay moments that the AI Director deems worthy of special recognition.

- **Trigger:** `checkAndAwardMatchFeats` runs after every match, checking for specific scenarios.
- **Examples:**
  - **The Stomp:** Winning 2-0 in under 15 minutes.
  - **The Mirror:** Winning a match where both players had the same deck color identity.
  - **The Upset:** A player with a low win-rate defeats a player with a very high win-rate.
- **Rarity Mapping:** Rarity is determined by the AI, but is typically **Rare** or **Mythic**.
- **Uniqueness:** These badges are created as unique entries (`is_unique: true`) and are not added to the global pool.

### D. Milestone Badges

These are simpler, stat-based achievements.

- **Trigger:** `checkAndAwardBadges` runs after every match.
- **Examples:**
  - "Hot Hand": Win 3 matches in a row.
  - "Iron Man": Play 10 matches in a single event.
- **Rarity Mapping:** Most milestone badges are **Common**.

---

## 4. Implementation Details

- **Core Logic:** The badge-awarding logic resides in `lib/badges.ts` and `app/tournament/actions.ts`.
- **AI Prompts:** The "personality" of the AI Director is defined in the prompts within `lib/ai-director.ts`.
- **Visuals:** The `TrophyCase` component in `components/profile/trophy-case.tsx` reads badge `metadata.rarity` to apply the correct visual styling.
- **Database:** The `badges` table stores the template for each achievement, while `profile_badges` links them to users. Rarity, rank, and other contextual information are stored in the `metadata` JSONB column.
