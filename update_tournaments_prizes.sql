-- Add prize columns to tournaments table
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS prize_1st TEXT NULL,
ADD COLUMN IF NOT EXISTS prize_2nd TEXT NULL,
ADD COLUMN IF NOT EXISTS prize_3rd TEXT NULL;
