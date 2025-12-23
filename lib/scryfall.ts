export interface ScryfallCard {
  id: string;
  oracle_id?: string;
  name: string;
  image_uris?: {
    normal?: string;
    art_crop?: string;
    large?: string;
    png?: string;
    border_crop?: string;
  };
  color_identity: string[];
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  flavor_text?: string;
  set_name?: string;
  set?: string;
  collector_number?: string;
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
      oracle_id: data.oracle_id,
      name: data.name,
      image_uris: data.image_uris,
      color_identity: data.color_identity,
      mana_cost: data.mana_cost,
      type_line: data.type_line,
      oracle_text: data.oracle_text,
      flavor_text: data.flavor_text,
      set_name: data.set_name,
      set: data.set,
      collector_number: data.collector_number,
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
      oracle_id: data.oracle_id,
      name: data.name,
      image_uris: data.image_uris,
      color_identity: data.color_identity,
      mana_cost: data.mana_cost,
      type_line: data.type_line,
      oracle_text: data.oracle_text,
      flavor_text: data.flavor_text,
      set_name: data.set_name,
      set: data.set,
      collector_number: data.collector_number,
    }));
  } catch (error) {
    console.error('Error searching Scryfall:', error);
    return [];
  }
}

export async function getCardPrints(cardName: string): Promise<ScryfallCard[]> {
  if (!cardName) return [];

  try {
    // Search for all unique prints of the card by exact name
    const query = `!"${cardName}" unique:prints`;
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
      oracle_id: data.oracle_id,
      name: data.name,
      image_uris: data.image_uris,
      color_identity: data.color_identity,
      mana_cost: data.mana_cost,
      type_line: data.type_line,
      oracle_text: data.oracle_text,
      flavor_text: data.flavor_text,
      set_name: data.set_name,
      set: data.set,
      collector_number: data.collector_number,
    }));
  } catch (error) {
    console.error('Error fetching card prints:', error);
    return [];
  }
}