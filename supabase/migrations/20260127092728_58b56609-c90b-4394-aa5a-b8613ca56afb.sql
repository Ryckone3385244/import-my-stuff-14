-- Remove duplicate registration policy (both do the same thing)
DROP POLICY IF EXISTS "Allow public registration insertions" ON public.registrations;