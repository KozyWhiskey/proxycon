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

export async function generateSetBadge(setCode: string, setName: string, rank?: number) {
  let rankText = "a Draft or Sealed tournament";
  let rarityInstruction = "";
  
  if (rank) {
    if (rank === 1) {
      rankText = "1st Place (Champion) in a Draft or Sealed tournament";
      rarityInstruction = "Set rarity to 'mythic'.";
    } else if (rank === 2) {
      rankText = "2nd Place (Finalist) in a Draft or Sealed tournament";
      rarityInstruction = "Set rarity to 'rare'.";
    } else if (rank === 3) {
      rankText = "3rd Place in a Draft or Sealed tournament";
      rarityInstruction = "Set rarity to 'uncommon'.";
    }
  }

  const prompt = `
    You are "The Director", a snarky, observant, and slightly sadistic AI game show host for a Magic: The Gathering tournament.
    
    Your task is to create a unique achievement badge for a player who achieved:
    ${rankText}
    
    Expansion Set:
    Set Name: ${setName}
    Set Code: ${setCode}
    
    Analyze the set's mechanics, themes, and reputation in the community.
    Create a "Roast" style achievement. It should be funny, maybe a little mean, but ultimately a badge of honor.
    ${rarityInstruction}
    
    Examples:
    - Modern Horizons 3: "The Power Creeper" (You paid $100 for this draft and all you got was this digital badge)
    - Bloomburrow: "Furry Force" (Cute animals, violent outcomes)
    - Kamigawa: Neon Dynasty: "The Weeb" (You like your magic with extra anime)
    - Outlaws of Thunder Junction: "The Villain" (Committing crimes is profitable)
  `;

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: badgeSchema,
      prompt: prompt,
    });

    // Enforce rarity based on rank if provided
    if (rank === 1) object.rarity = 'mythic';
    else if (rank === 2) object.rarity = 'rare';
    else if (rank === 3) object.rarity = 'uncommon';

    return object;
  } catch (error) {
    console.error('Error generating set badge:', error);
    return null;
  }
}

export async function generateMatchFeat(
  triggerType: 'upset' | 'stomp' | 'mirror',
  context: {
    winnerName?: string;
    loserName?: string;
    winnerDeck?: string;
    loserDeck?: string;
    score?: string;
  }
) {
  const triggers = {
    upset: `
      Trigger: "The Upset"
      Context: A low-win-rate player/deck (${context.winnerName} with ${context.winnerDeck || 'Unknown'}) beat a high-win-rate favorite (${context.loserName} with ${context.loserDeck || 'Unknown'}).
      Goal: Roast the favorite for losing, or praise the underdog for the miracle.
    `,
    stomp: `
      Trigger: "The Stomp"
      Context: A 2-0 victory that happened very quickly.
      Winner: ${context.winnerName}.
      Score: ${context.score}.
      Goal: Comment on the speed and brutality of the match.
    `,
    mirror: `
      Trigger: "The Mirror"
      Context: Both players were playing the exact same colors/strategy.
      Winner: ${context.winnerName}.
      Goal: Make a reference to "There can be only one" or looking in a mirror.
    `
  };

  const prompt = `
    You are "The Director", a snarky AI game show host.
    
    A special event just occurred in a match:
    ${triggers[triggerType]}
    
    Create a unique, one-time achievement badge for this moment.
    It should be memorable and specific to this event.
  `;

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: badgeSchema,
      prompt: prompt,
    });

    return object;
  } catch (error) {
    console.error('Error generating match feat:', error);
    return null;
  }
}
