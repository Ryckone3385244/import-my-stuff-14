-- Add contact email and phone fields to event_settings
ALTER TABLE public.event_settings 
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT;