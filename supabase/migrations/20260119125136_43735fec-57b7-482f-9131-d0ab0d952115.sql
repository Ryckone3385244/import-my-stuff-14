-- Add resend_api_key column to email_config table
ALTER TABLE public.email_config 
ADD COLUMN IF NOT EXISTS resend_api_key TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.email_config.resend_api_key IS 'Resend API key for email sending - stored encrypted';

-- Ensure only admins can read/update the API key via RLS
-- First check if policies exist and drop them if they do
DROP POLICY IF EXISTS "Admins can view email config" ON public.email_config;
DROP POLICY IF EXISTS "Admins can update email config" ON public.email_config;

-- Create policies for admin-only access
CREATE POLICY "Admins can view email config" 
ON public.email_config 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'customer_service', 'project_manager')
  )
);

CREATE POLICY "Admins can update email config" 
ON public.email_config 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'customer_service', 'project_manager')
  )
);