-- Create password_setup_tokens table for first-time password setup flow
CREATE TABLE public.password_setup_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  user_type TEXT NOT NULL CHECK (user_type IN ('exhibitor', 'speaker')),
  entity_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_setup_tokens ENABLE ROW LEVEL SECURITY;

-- Admins, CS, and PM can manage all tokens
CREATE POLICY "Admins, CS, and PM can manage password setup tokens"
ON public.password_setup_tokens
FOR ALL
USING (is_admin_or_cs_or_pm(auth.uid()));

-- Public read access for token validation (set-password endpoint)
CREATE POLICY "Anyone can read tokens for validation"
ON public.password_setup_tokens
FOR SELECT
USING (true);

-- Create index for faster token lookups
CREATE INDEX idx_password_setup_tokens_token ON public.password_setup_tokens(token);
CREATE INDEX idx_password_setup_tokens_user_id ON public.password_setup_tokens(user_id);