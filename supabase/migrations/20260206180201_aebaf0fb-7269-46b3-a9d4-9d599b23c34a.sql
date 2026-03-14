-- Create credentials_log table for tracking generated credentials
CREATE TABLE public.credentials_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_plain TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID,
  generation_type TEXT NOT NULL DEFAULT 'create',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credentials_log ENABLE ROW LEVEL SECURITY;

-- SELECT: only admin/CS/PM roles
CREATE POLICY "Admins, CS, and PM can view credentials log" 
ON public.credentials_log FOR SELECT 
USING (
  public.is_admin_or_cs_or_pm(auth.uid())
);

-- INSERT: service role bypass handles edge function inserts
CREATE POLICY "Admins, CS, and PM can insert credentials log" 
ON public.credentials_log FOR INSERT 
WITH CHECK (
  public.is_admin_or_cs_or_pm(auth.uid())
);

-- DELETE: only admin/CS/PM roles
CREATE POLICY "Admins can delete credentials log" 
ON public.credentials_log FOR DELETE 
USING (
  public.is_admin_or_cs_or_pm(auth.uid())
);

-- Performance indexes
CREATE INDEX idx_credentials_log_entity ON public.credentials_log(entity_type, entity_id);
CREATE INDEX idx_credentials_log_generated_at ON public.credentials_log(generated_at DESC);