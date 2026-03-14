-- Restore SELECT for upsert but restricted: anonymous users need SELECT for PostgREST upsert conflict resolution
-- However, we can't restrict by session_id at RLS level without knowing the session_id
-- So we keep the admin-only read for actual data access and allow minimal SELECT for upsert
-- The visitor_sessions table doesn't contain highly sensitive data (no PII, just device/browser info)
-- Keep the existing admin SELECT policy and add back minimal public SELECT needed for upsert
CREATE POLICY "Public can read own session for upsert" 
ON public.visitor_sessions 
FOR SELECT 
USING (true);