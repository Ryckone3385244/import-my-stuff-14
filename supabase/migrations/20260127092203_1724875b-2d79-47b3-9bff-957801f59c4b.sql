-- Drop the overly permissive policy that allows anyone to view all speaker data
DROP POLICY IF EXISTS "Anyone can view speakers" ON public.speakers;
DROP POLICY IF EXISTS "Staff can view all speakers" ON public.speakers;
DROP POLICY IF EXISTS "Speakers can view own data" ON public.speakers;
DROP POLICY IF EXISTS "Staff can insert speakers" ON public.speakers;
DROP POLICY IF EXISTS "Staff can update speakers" ON public.speakers;
DROP POLICY IF EXISTS "Speakers can update own profile" ON public.speakers;
DROP POLICY IF EXISTS "Staff can delete speakers" ON public.speakers;
DROP POLICY IF EXISTS "Admins, CS, and PM can delete speakers" ON public.speakers;
DROP POLICY IF EXISTS "Admins, CS, and PM can insert speakers" ON public.speakers;
DROP POLICY IF EXISTS "Admins, CS, and PM can update speakers" ON public.speakers;

-- Recreate proper RLS policies on speakers table

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