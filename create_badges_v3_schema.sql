-- Create badges table
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  category TEXT CHECK (category IN ('automated', 'manual', 'event')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profile_badges table
CREATE TABLE IF NOT EXISTS public.profile_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, badge_id, event_id)
);

-- Add RLS policies
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_badges ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read badges" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Public read profile_badges" ON public.profile_badges FOR SELECT USING (true);

-- Allow service role (or admins) to write - for now, using a permissive policy for testing if you're not admin
-- In production, restrict this to admin only or service role
CREATE POLICY "Admins insert badges" ON public.badges FOR INSERT WITH CHECK (true); -- Simplified for setup
CREATE POLICY "Admins insert profile_badges" ON public.profile_badges FOR INSERT WITH CHECK (true);

-- Seed Initial Badges
INSERT INTO public.badges (slug, name, description, category, icon_url) VALUES
('hot-hand', 'The Hot Hand', 'Won 3 matches in a row.', 'automated', '🔥'),
('champion', 'Champion', 'Won a tournament.', 'event', '🏆'),
('participation', 'Participant', 'Played in an event.', 'event', '🎟️'),
('iron-man', 'Iron Man', 'Played 10 matches in a single event.', 'automated', '🤖')
ON CONFLICT (slug) DO NOTHING;
