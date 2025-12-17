# Database Migration: Link Tournaments to Events

**Goal**: Establish a direct relationship between `tournaments` and `events`.

## SQL Migration Script

Run the following SQL in the Supabase SQL Editor.

```sql
-- 1. Add event_id to tournaments
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;

-- 2. Index for performance
CREATE INDEX IF NOT EXISTS idx_tournaments_event_id ON public.tournaments(event_id);

-- 3. (Optional) Create a default legacy event for existing tournaments
-- Only run this block if you have existing tournaments that you want to group.
-- DO NOT RUN if you want them to remain 'orphaned' or handle them manually.

/*
DO $$
DECLARE
  legacy_event_id UUID;
  current_user_id UUID;
BEGIN
  -- Attempt to find a user to be the owner (e.g., the first profile found)
  SELECT id INTO current_user_id FROM public.profiles LIMIT 1;

  IF current_user_id IS NOT NULL THEN
    -- Create legacy event
    INSERT INTO public.events (owner_id, name, is_active)
    VALUES (current_user_id, 'Legacy Tournaments', true)
    RETURNING id INTO legacy_event_id;

    -- Update existing tournaments
    UPDATE public.tournaments
    SET event_id = legacy_event_id
    WHERE event_id IS NULL;
    
    -- Also update matches that have tournaments but no event_id
    UPDATE public.matches
    SET event_id = legacy_event_id
    WHERE tournament_id IS NOT NULL AND event_id IS NULL;
  END IF;
END $$;
*/
```
