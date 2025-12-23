-- Migration: Add AI Gamification columns to Badges tables

-- 1. Update 'badges' table
ALTER TABLE public.badges 
ADD COLUMN IF NOT EXISTS generated_by TEXT DEFAULT 'system' CHECK (generated_by IN ('system', 'ai')),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Update 'profile_badges' table
ALTER TABLE public.profile_badges
ADD COLUMN IF NOT EXISTS is_unique BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_title TEXT,
ADD COLUMN IF NOT EXISTS custom_description TEXT;

-- 3. Add index for faster lookups on badge metadata (e.g. finding badge by commander_name)
CREATE INDEX IF NOT EXISTS idx_badges_metadata ON public.badges USING gin (metadata);
