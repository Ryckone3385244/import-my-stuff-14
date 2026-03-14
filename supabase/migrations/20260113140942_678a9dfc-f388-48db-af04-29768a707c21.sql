-- Add form embed columns to event_settings table
ALTER TABLE public.event_settings
ADD COLUMN IF NOT EXISTS register_interest_form_embed TEXT,
ADD COLUMN IF NOT EXISTS register_event_form_embed TEXT,
ADD COLUMN IF NOT EXISTS exhibitor_form_embed TEXT;