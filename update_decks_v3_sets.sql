-- Update decks table to support set tracking
ALTER TABLE public.decks 
ADD COLUMN IF NOT EXISTS set_code TEXT,
ADD COLUMN IF NOT EXISTS set_name TEXT;

-- Comment on new columns
COMMENT ON COLUMN public.decks.set_code IS 'Scryfall set code (e.g., mh3)';
COMMENT ON COLUMN public.decks.set_name IS 'Full expansion name (e.g., Modern Horizons 3)';
