-- Add ticker bar settings to event_settings table
ALTER TABLE public.event_settings
ADD COLUMN IF NOT EXISTS ticker_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ticker_text text,
ADD COLUMN IF NOT EXISTS ticker_link_text text,
ADD COLUMN IF NOT EXISTS ticker_link_url text;