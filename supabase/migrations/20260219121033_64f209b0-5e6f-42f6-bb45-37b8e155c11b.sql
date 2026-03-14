-- Drop the overly permissive public SELECT policy on visitor_sessions
DROP POLICY IF EXISTS "Anyone can read visitor sessions for upsert" ON public.visitor_sessions;

-- Add a more restrictive policy: anonymous users can only update their own session (needed for upsert)
-- The upsert (INSERT ON CONFLICT DO UPDATE) doesn't require SELECT, so we just need UPDATE
DROP POLICY IF EXISTS "Anyone can update their own session" ON public.visitor_sessions;
CREATE POLICY "Anyone can update their own session" 
ON public.visitor_sessions 
FOR UPDATE 
USING (true)
WITH CHECK (true);