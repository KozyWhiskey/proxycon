export interface ScryfallCard {
  id: string;
  name: string;
  image_uris?: {
    normal: string;
    art_crop: string;
  };
  color_identity: string[];
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
}

export async function searchCard(query: string): Promise<ScryfallCard | null> {
  if (!query) return null;

  try {
    const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Not found
      }
      throw new Error(`Scryfall API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      image_uris: data.image_uris,
      color_identity: data.color_identity,
      mana_cost: data.mana_cost,
      type_line: data.type_line,
      oracle_text: data.oracle_text,
    };
  } catch (error) {
    console.error('Error fetching from Scryfall:', error);
    return null;
  }
}

export async function searchCards(query: string): Promise<ScryfallCard[]> {
  if (!query) return [];

  try {
    const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return []; // Not found
      }
      throw new Error(`Scryfall API error: ${response.statusText}`);
    }

    const json = await response.json();
    if (!json.data) return [];

    return json.data.map((data: any) => ({
      id: data.id,
      name: data.name,
      image_uris: data.image_uris,
      color_identity: data.color_identity,
      mana_cost: data.mana_cost,
      type_line: data.type_line,
      oracle_text: data.oracle_text,
    }));
  } catch (error) {
    console.error('Error searching Scryfall:', error);
    return [];
  }
}
