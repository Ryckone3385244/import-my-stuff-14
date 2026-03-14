-- Add announcement popup columns to event_settings table
ALTER TABLE public.event_settings
ADD COLUMN popup_enabled boolean DEFAULT false,
ADD COLUMN popup_image_url text,
ADD COLUMN popup_link_url text;