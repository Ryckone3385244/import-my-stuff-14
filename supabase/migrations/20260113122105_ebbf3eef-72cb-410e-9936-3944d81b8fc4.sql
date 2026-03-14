-- Drop the overly permissive ALL policy
DROP POLICY IF EXISTS "Authenticated users can manage section orders" ON public.page_section_order;

-- Create role-based policies for page_section_order
CREATE POLICY "Admins, CS, and PM can insert section_order"
ON public.page_section_order
FOR INSERT
WITH CHECK (is_admin_or_cs_or_pm(auth.uid()));

CREATE POLICY "Admins, CS, and PM can update section_order"
ON public.page_section_order
FOR UPDATE
USING (is_admin_or_cs_or_pm(auth.uid()));

CREATE POLICY "Admins, CS, and PM can delete section_order"
ON public.page_section_order
FOR DELETE
USING (is_admin_or_cs_or_pm(auth.uid()));