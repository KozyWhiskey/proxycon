-- V3 Schema Verification and Update Script (Idempotent)
-- Run this in the Supabase SQL Editor

-- 1. Profiles (Global Identity)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    favorite_card_image TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Events (Container)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    invite_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Event Members (Linking Profiles to Events)
CREATE TABLE IF NOT EXISTS public.event_members (
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('owner', 'admin', 'player', 'spectator')),
    display_name_override TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (event_id, profile_id)
);

-- 4. Decks (Global Assets)
CREATE TABLE IF NOT EXISTS public.decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    format TEXT NOT NULL,
    colors TEXT[],
    commander_name TEXT,
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tournaments (Competition Engine)
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    format TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'active', 'completed')),
    max_rounds INTEGER DEFAULT 3,
    round_duration_minutes INTEGER DEFAULT 50,
    prize_1st TEXT,
    prize_2nd TEXT,
    prize_3rd TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tournament Participants (Roster & Seating)
CREATE TABLE IF NOT EXISTS public.tournament_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    draft_seat INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, profile_id)
);

-- 7. Matches (Atomic Gameplay)
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
    round_number INTEGER,
    game_type TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    paused_at TIMESTAMP WITH TIME ZONE,
    remaining_seconds INTEGER,
    total_paused_seconds INTEGER DEFAULT 0,
    ai_commentary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Match Participants (Results)
CREATE TABLE IF NOT EXISTS public.match_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    deck_id UUID REFERENCES public.decks(id) ON DELETE SET NULL,
    result TEXT CHECK (result IN ('win', 'loss', 'draw')),
    games_won INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(match_id, profile_id)
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation (Drop before Create)

-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Events
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
CREATE POLICY "Authenticated users can create events" ON public.events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Owners can update events" ON public.events;
CREATE POLICY "Owners can update events" ON public.events FOR UPDATE USING (auth.uid() = owner_id);

-- Event Members
DROP POLICY IF EXISTS "Event members viewable by everyone" ON public.event_members;
CREATE POLICY "Event members viewable by everyone" ON public.event_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can join events" ON public.event_members;
CREATE POLICY "Authenticated users can join events" ON public.event_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins can update members" ON public.event_members;
CREATE POLICY "Admins can update members" ON public.event_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.event_members em 
    WHERE em.event_id = event_members.event_id 
    AND em.profile_id = auth.uid() 
    AND em.role IN ('owner', 'admin')
  )
);

-- Decks
DROP POLICY IF EXISTS "Decks viewable by everyone" ON public.decks;
CREATE POLICY "Decks viewable by everyone" ON public.decks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create decks" ON public.decks;
CREATE POLICY "Users can create decks" ON public.decks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Owners can update decks" ON public.decks;
CREATE POLICY "Owners can update decks" ON public.decks FOR UPDATE USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Owners can delete decks" ON public.decks;
CREATE POLICY "Owners can delete decks" ON public.decks FOR DELETE USING (auth.uid() = owner_id);

-- Tournaments
DROP POLICY IF EXISTS "Tournaments viewable by everyone" ON public.tournaments;
CREATE POLICY "Tournaments viewable by everyone" ON public.tournaments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can create tournaments" ON public.tournaments;
CREATE POLICY "Authenticated users can create tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update tournaments" ON public.tournaments;
CREATE POLICY "Authenticated users can update tournaments" ON public.tournaments FOR UPDATE USING (auth.role() = 'authenticated');

-- Tournament Participants
DROP POLICY IF EXISTS "Tournament participants viewable by everyone" ON public.tournament_participants;
CREATE POLICY "Tournament participants viewable by everyone" ON public.tournament_participants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can add participants" ON public.tournament_participants;
CREATE POLICY "Authenticated users can add participants" ON public.tournament_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Matches
DROP POLICY IF EXISTS "Matches viewable by everyone" ON public.matches;
CREATE POLICY "Matches viewable by everyone" ON public.matches FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can create matches" ON public.matches;
CREATE POLICY "Authenticated users can create matches" ON public.matches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update matches" ON public.matches;
CREATE POLICY "Authenticated users can update matches" ON public.matches FOR UPDATE USING (auth.role() = 'authenticated');

-- Match Participants
DROP POLICY IF EXISTS "Match participants viewable by everyone" ON public.match_participants;
CREATE POLICY "Match participants viewable by everyone" ON public.match_participants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can create match participants" ON public.match_participants;
CREATE POLICY "Authenticated users can create match participants" ON public.match_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update match participants" ON public.match_participants;
CREATE POLICY "Authenticated users can update match participants" ON public.match_participants FOR UPDATE USING (auth.role() = 'authenticated');

-- Migration Helper: If 'event_participants' exists and 'event_members' is empty, migrate data then rename/drop
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_participants') THEN
    -- Only rename if event_members doesn't exist yet, or just drop legacy if empty
    -- For safety, we'll just try to rename if members is empty or missing
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_members') THEN
        ALTER TABLE public.event_participants RENAME TO event_members;
    END IF;
  END IF;
END $$;