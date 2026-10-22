import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { searchCard, searchCards, ScryfallCard } from '@/lib/scryfall';
import { isBasicLand } from '@/lib/activity';

const cardListSchema = z.object({
  cards: z.array(z.object({
    name: z.string(),
    count: z.number().int().min(1).max(40),
  })),
});

export interface ResolvedDeckCard {
  name: string;
  count: number;
  scryfallId: string | null;
  setCode: string | null;
  collectorNumber: string | null;
  imageUrl: string | null;
  flagged: boolean;
}

function visionModel() {
  if (process.env.OPENAI_API_KEY) return openai('gpt-4o');
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return google('gemini-2.0-flash');
  return null;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchCubeName(candidate: string, cubeNames: string[]): string | null {
  const target = normalize(candidate);
  const exact = cubeNames.find((name) => normalize(name) === target);
  if (exact) return exact;
  const partial = cubeNames.filter((name) => {
    const normalized = normalize(name);
    return normalized.includes(target) || target.includes(normalized);
  });
  return partial.length === 1 ? partial[0] : null;
}

async function printedCard(name: string, setCodes: string[]): Promise<ScryfallCard | null> {
  const cleaned = name.replace(/"/g, '').trim();
  if (!cleaned) return null;
  if (setCodes.length > 0 && !isBasicLand(cleaned)) {
    const clause = setCodes.map((code) => `set:${code}`).join(' OR ');
    const found = await searchCards(`!"${cleaned}" (${clause})`);
    return found[0] || null;
  }
  return searchCard(cleaned);
}

export async function readCardsFromPhotos(
  images: { bytes: Uint8Array; mediaType: string }[],
  universeHint: string
) {
  const model = visionModel();
  if (!model) {
    throw new Error('Set OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY before reading a deck photo.');
  }

  const { object } = await generateObject({
    model,
    schema: cardListSchema,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Read the Magic cards whose name lines are fully visible. Return the English card name and how many copies you can see. Skip cards that are stacked, cropped to a sliver, or covered across the title. Do not invent cards.
${universeHint}`,
          },
          ...images.map((image) => ({
            type: 'image' as const,
            image: image.bytes,
            mediaType: image.mediaType,
          })),
        ],
      },
    ],
  });

  return object.cards;
}

export async function resolveDeckCards(
  raw: { name: string; count: number }[],
  universe: { setCodes: string[]; cubeNames: string[] | null; singleton: boolean }
): Promise<ResolvedDeckCard[]> {
  const resolved: ResolvedDeckCard[] = [];

  for (const card of raw) {
    let flagged = false;
    let name = card.name.trim();

    if (universe.cubeNames && !isBasicLand(name)) {
      const matched = matchCubeName(name, universe.cubeNames);
      if (!matched) flagged = true;
      else name = matched;
    }

    const printed = await printedCard(name, universe.setCodes);
    if (!printed) flagged = true;
    if (universe.singleton && card.count > 1 && !isBasicLand(printed?.name || name)) flagged = true;

    resolved.push({
      name: printed?.name || name,
      count: card.count,
      scryfallId: printed?.id || null,
      setCode: printed?.set || null,
      collectorNumber: printed?.collector_number || null,
      imageUrl: printed?.image_uris?.normal || null,
      flagged,
    });
  }

  return resolved;
}
