-- Create a public view for speakers that excludes sensitive contact information
CREATE OR REPLACE VIEW public.speakers_public
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  title,
  company,
  bio,
  photo_url,
  linkedin_url,
  seminar_title,
  seminar_description,
  company_logo_url,
  is_active,
  created_at,
  updated_at
FROM public.speakers;

-- Drop existing RLS policies on speakers table if any
DROP POLICY IF EXISTS "Enable read access for all users" ON public.speakers;
DROP POLICY IF EXISTS "Speakers are viewable by everyone" ON public.speakers;
DROP POLICY IF EXISTS "Public read access" ON public.speakers;
DROP POLICY IF EXISTS "Anyone can view speakers" ON public.speakers;
DROP POLICY IF EXISTS "Allow public read access" ON public.speakers;

-- Enable RLS on speakers table (ensure it's enabled)
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;

-- Policy: Admins, CS, and PM can read all speaker data including email/phone
CREATE POLICY "Staff can view all speakers"
ON public.speakers
FOR SELECT
TO authenticated
USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- Policy: Speakers can view their own full data
CREATE POLICY "Speakers can view own data"
ON public.speakers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Admins can insert speakers
CREATE POLICY "Staff can insert speakers"
ON public.speakers
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));

-- Policy: Admins can update speakers
CREATE POLICY "Staff can update speakers"
ON public.speakers
FOR UPDATE
TO authenticated
USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- Policy: Speakers can update their own profile
CREATE POLICY "Speakers can update own profile"
ON public.speakers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Admins can delete speakers
CREATE POLICY "Staff can delete speakers"
ON public.speakers
FOR DELETE
TO authenticated
USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- Grant SELECT on the public view to anon and authenticated
GRANT SELECT ON public.speakers_public TO anon;
GRANT SELECT ON public.speakers_public TO authenticated;