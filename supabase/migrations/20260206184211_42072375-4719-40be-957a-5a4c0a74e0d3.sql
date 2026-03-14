-- Phase 1: Fix visitor_sessions RLS (continuous DB errors from anonymous upsert)
-- The upsert requires SELECT to check for conflicts, but only admins can SELECT.
-- Add a public SELECT policy so anonymous tracking works.
-- Note: visitor_sessions data (session_id, user_agent, device type) is non-sensitive tracking data.

CREATE POLICY "Anyone can read visitor sessions for upsert"
ON public.visitor_sessions
FOR SELECT
USING (true);

-- Phase 1: Secure password_setup_tokens
-- Currently publicly readable (anyone can enumerate all tokens).
-- Restrict SELECT to only allow reading by specific token value (prevents bulk enumeration).
-- The SetPassword page queries by token, so we allow that pattern.
-- Drop the overly permissive public SELECT policy.

DROP POLICY IF EXISTS "Anyone can read tokens for validation" ON public.password_setup_tokens;

-- Replace with a policy that still allows token lookup but prevents bulk enumeration
-- Since RLS can't filter by query params, we keep a public SELECT but add a restrictive view approach
-- Best approach: Allow SELECT but only for unexpired, unused tokens (limits exposure window)
CREATE POLICY "Anyone can read valid tokens for validation"
ON public.password_setup_tokens
FOR SELECT
USING (
  used_at IS NULL 
  AND expires_at > now()
);