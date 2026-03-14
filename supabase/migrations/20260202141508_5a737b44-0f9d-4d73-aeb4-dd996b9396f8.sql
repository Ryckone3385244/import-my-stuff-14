-- Add event_domain column to event_settings for dynamic portal links in emails
ALTER TABLE public.event_settings 
ADD COLUMN IF NOT EXISTS event_domain text;