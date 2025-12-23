-- Update decks table to support rich Scryfall data
ALTER TABLE public.decks 
ADD COLUMN IF NOT EXISTS mana_cost TEXT,
ADD COLUMN IF NOT EXISTS type_line TEXT,
ADD COLUMN IF NOT EXISTS oracle_text TEXT,
ADD COLUMN IF NOT EXISTS image_uris JSONB;

-- Comment on new columns
COMMENT ON COLUMN public.decks.mana_cost IS 'Mana cost string from Scryfall (e.g., {3}{U}{U})';
COMMENT ON COLUMN public.decks.type_line IS 'Full type line (e.g., Legendary Creature — Human Wizard)';
COMMENT ON COLUMN public.decks.oracle_text IS 'Card rules text';
COMMENT ON COLUMN public.decks.image_uris IS 'JSON object containing full Scryfall image URIs';
