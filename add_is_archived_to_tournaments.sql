-- Add is_archived column to tournaments table for soft delete
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
