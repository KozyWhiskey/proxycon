import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { ScryfallCard } from '@/lib/scryfall';

const badgeSchema = z.object({
  name: z.string().describe('The name of the achievement. Funny, snarky, or pun-based.'),
  description: z.string().describe('A sarcastic or observant description of why this was awarded.'),
  rarity: z.enum(['common', 'rare', 'mythic']).describe('How impressive or rare this achievement is.'),
});

export async function generateCommanderBadge(card: ScryfallCard) {
  const prompt = `
    You are "The Director", a snarky, observant, and slightly sadistic AI game show host for a Magic: The Gathering tournament.
    
    Your task is to create a unique achievement badge for a player who just won a game using the following Commander:
    
    Name: ${card.name}
    Type: ${card.type_line}
    Colors: ${card.color_identity.join('')}
    Oracle Text: ${card.oracle_text}
    Flavor Text: ${card.flavor_text || 'None'}
    
    Analyze the card's mechanics, lore, and reputation in the EDH community.
    Create a "Roast" style achievement. It should be funny, maybe a little mean, but ultimately a badge of honor.
    
    Examples:
    - Atraxa: "The Arithmetic Nerd" (You like counting counters more than playing magic)
    - Krenko: "Goblin CEO" (Pyramid schemes work if you have enough goblins)
    - Blue Control: "The Fun Police" (No one else gets to play today)
  `;

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: badgeSchema,
      prompt: prompt,
    });

    return object;
  } catch (error) {
    console.error('Error generating badge:', error);
    return null;
  }
}
