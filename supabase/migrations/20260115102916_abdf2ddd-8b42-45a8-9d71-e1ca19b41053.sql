-- Add Resend email configuration columns to event_settings
ALTER TABLE public.event_settings
ADD COLUMN IF NOT EXISTS resend_from_name TEXT DEFAULT 'Customer Connect Expo',
ADD COLUMN IF NOT EXISTS resend_from_domain TEXT DEFAULT 'fortemevents.com';