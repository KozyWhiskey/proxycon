const HOST = 'budget-deck-site.vercel.app';

export interface BudgetDeckSnapshot {
  url: string;
  name: string;
  price: number | null;
  format: string | null;
  list: string;
}

function allowedUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:' || url.hostname !== HOST) return null;
    if (!/^\/decks\/[0-9a-f-]{36}(\/locks\/[0-9a-f-]{36})?\/?$/i.test(url.pathname)) return null;
    return url;
  } catch {
    return null;
  }
}

export async function fetchBudgetDeck(raw: string): Promise<{ snapshot?: BudgetDeckSnapshot; message?: string }> {
  const url = allowedUrl(raw);
  if (!url) return { message: 'Paste a deck link from budget-deck-site.vercel.app' };

  const response = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!response.ok) return { message: 'That deck page did not load' };
  const html = await response.text();

  const name = html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1]?.trim();
  if (!name) return { message: 'That page did not include a deck name' };

  const priceText = html.match(/Budget price<\/div><div class="text-2xl font-bold">\$([0-9.]+)/)?.[1]
    || html.match(/Locked at <!-- -->\$([0-9.]+)/)?.[1];
  const price = priceText ? Number(priceText) : null;

  const format = /Commander/i.test(html.slice(0, 8000))
    ? 'commander'
    : /Vintage/i.test(html.slice(0, 8000))
      ? 'vintage'
      : null;

  const cards = [...html.matchAll(/<span class="text-muted-foreground w-6 text-right tabular-nums">(\d+)<\/span><button[^>]*>([^<]+)<\/button>/g)]
    .map((match) => `${match[1]} ${match[2].trim()}`);

  if (cards.length === 0) return { message: 'No cards were listed on that page' };

  return {
    snapshot: {
      url: url.toString(),
      name,
      price: Number.isFinite(price) ? price : null,
      format,
      list: cards.join('\n'),
    },
  };
}
