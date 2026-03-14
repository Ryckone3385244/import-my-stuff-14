-- Add event_id column to speakers table for multi-event support
ALTER TABLE public.speakers ADD COLUMN IF NOT EXISTS event_id uuid;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_speakers_event_id ON public.speakers(event_id);