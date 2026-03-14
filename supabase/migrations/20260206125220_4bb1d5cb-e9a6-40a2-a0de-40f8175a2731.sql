-- Add favicon_url column to event_settings
ALTER TABLE public.event_settings
ADD COLUMN favicon_url text DEFAULT NULL;