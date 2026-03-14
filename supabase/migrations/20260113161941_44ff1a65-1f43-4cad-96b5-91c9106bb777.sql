-- Add floorplan_url column to event_settings table
ALTER TABLE public.event_settings 
ADD COLUMN IF NOT EXISTS floorplan_url TEXT;