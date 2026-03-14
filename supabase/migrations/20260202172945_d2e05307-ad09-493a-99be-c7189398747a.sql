-- Add no_mobile_swap column to page_section_order
ALTER TABLE public.page_section_order ADD COLUMN IF NOT EXISTS no_mobile_swap BOOLEAN DEFAULT false;

-- Create function to sync speaker submissions to event-scoped speakers
CREATE OR REPLACE FUNCTION public.sync_speaker_submissions_to_event(target_event_id UUID)
RETURNS TABLE (
  submission_id UUID,
  old_speaker_id UUID,
  new_speaker_id UUID,
  speaker_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH orphaned_submissions AS (
    -- Find submissions linked to speakers without an event_id (legacy) or different event
    SELECT 
      ss.id as submission_id,
      ss.speaker_id as old_speaker_id,
      s.name as speaker_name
    FROM speaker_submissions ss
    JOIN speakers s ON s.id = ss.speaker_id
    WHERE s.event_id IS NULL OR s.event_id != target_event_id
  ),
  target_speakers AS (
    -- Find speakers that belong to the target event
    SELECT id, name
    FROM speakers
    WHERE event_id = target_event_id
  ),
  matches AS (
    -- Match by normalized name (case-insensitive, trimmed)
    SELECT 
      os.submission_id,
      os.old_speaker_id,
      ts.id as new_speaker_id,
      os.speaker_name
    FROM orphaned_submissions os
    JOIN target_speakers ts ON LOWER(TRIM(os.speaker_name)) = LOWER(TRIM(ts.name))
  )
  -- Perform the update and return the matched records
  UPDATE speaker_submissions ss
  SET speaker_id = m.new_speaker_id
  FROM matches m
  WHERE ss.id = m.submission_id
  RETURNING ss.id, m.old_speaker_id, m.new_speaker_id, m.speaker_name;
END;
$$;

-- Create function to sync draft sessions to event-scoped speakers
CREATE OR REPLACE FUNCTION public.sync_draft_sessions_to_event(target_event_id UUID)
RETURNS TABLE (
  session_id UUID,
  old_speaker_id UUID,
  new_speaker_id UUID,
  speaker_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH orphaned_sessions AS (
    -- Find draft sessions linked to speakers without an event_id (legacy) or different event
    SELECT 
      ds.id as session_id,
      ds.speaker_id as old_speaker_id,
      s.name as speaker_name
    FROM draft_sessions ds
    JOIN speakers s ON s.id = ds.speaker_id
    WHERE s.event_id IS NULL OR s.event_id != target_event_id
  ),
  target_speakers AS (
    -- Find speakers that belong to the target event
    SELECT id, name
    FROM speakers
    WHERE event_id = target_event_id
  ),
  matches AS (
    -- Match by normalized name (case-insensitive, trimmed)
    SELECT 
      os.session_id,
      os.old_speaker_id,
      ts.id as new_speaker_id,
      os.speaker_name
    FROM orphaned_sessions os
    JOIN target_speakers ts ON LOWER(TRIM(os.speaker_name)) = LOWER(TRIM(ts.name))
  )
  -- Perform the update and return the matched records
  UPDATE draft_sessions ds
  SET speaker_id = m.new_speaker_id
  FROM matches m
  WHERE ds.id = m.session_id
  RETURNING ds.id, m.old_speaker_id, m.new_speaker_id, m.speaker_name;
END;
$$;