-- Recreate speakers_public view WITHOUT security_invoker
-- This allows the view to bypass base table RLS while only exposing safe columns

DROP VIEW IF EXISTS public.speakers_public;

CREATE VIEW public.speakers_public AS
SELECT 
  id,
  name,
  bio,
  photo_url,
  title,
  company,
  company_logo_url,
  linkedin_url,
  seminar_title,
  seminar_description,
  is_active,
  created_at,
  updated_at
FROM public.speakers;

-- Grant SELECT to anon and authenticated roles
GRANT SELECT ON public.speakers_public TO anon, authenticated;