-- Function to sync speaker_submissions from legacy speakers to event-scoped speakers by name
CREATE OR REPLACE FUNCTION public.sync_speaker_submissions_to_event(p_event_id uuid)
RETURNS TABLE(
  speaker_name text,
  old_speaker_id uuid,
  new_speaker_id uuid,
  submissions_migrated bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH migrated AS (
    UPDATE speaker_submissions ss
    SET speaker_id = new_s.id
    FROM speakers old_s
    INNER JOIN speakers new_s ON LOWER(TRIM(old_s.name)) = LOWER(TRIM(new_s.name))
    WHERE ss.speaker_id = old_s.id
      AND old_s.id != new_s.id
      -- old speaker has no event_id or different event_id
      AND (old_s.event_id IS NULL OR old_s.event_id != p_event_id)
      -- new speaker belongs to the target event
      AND new_s.event_id = p_event_id
    RETURNING old_s.name AS speaker_name, old_s.id AS old_speaker_id, new_s.id AS new_speaker_id
  )
  SELECT 
    m.speaker_name::text,
    m.old_speaker_id,
    m.new_speaker_id,
    COUNT(*)::bigint AS submissions_migrated
  FROM migrated m
  GROUP BY m.speaker_name, m.old_speaker_id, m.new_speaker_id;
END;
$function$;

-- Function to sync draft_sessions from legacy speakers to event-scoped speakers by name
CREATE OR REPLACE FUNCTION public.sync_draft_sessions_to_event(p_event_id uuid)
RETURNS TABLE(
  speaker_name text,
  old_speaker_id uuid,
  new_speaker_id uuid,
  sessions_migrated bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH migrated AS (
    UPDATE draft_sessions ds
    SET speaker_id = new_s.id
    FROM speakers old_s
    INNER JOIN speakers new_s ON LOWER(TRIM(old_s.name)) = LOWER(TRIM(new_s.name))
    WHERE ds.speaker_id = old_s.id
      AND old_s.id != new_s.id
      -- old speaker has no event_id or different event_id
      AND (old_s.event_id IS NULL OR old_s.event_id != p_event_id)
      -- new speaker belongs to the target event
      AND new_s.event_id = p_event_id
    RETURNING old_s.name AS speaker_name, old_s.id AS old_speaker_id, new_s.id AS new_speaker_id
  )
  SELECT 
    m.speaker_name::text,
    m.old_speaker_id,
    m.new_speaker_id,
    COUNT(*)::bigint AS sessions_migrated
  FROM migrated m
  GROUP BY m.speaker_name, m.old_speaker_id, m.new_speaker_id;
END;
$function$;