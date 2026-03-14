-- Drop the sync functions as they rely on event_id column which doesn't exist
DROP FUNCTION IF EXISTS public.sync_speaker_submissions_to_event(uuid);
DROP FUNCTION IF EXISTS public.sync_draft_sessions_to_event(uuid);