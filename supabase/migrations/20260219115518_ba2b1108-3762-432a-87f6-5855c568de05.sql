
-- 1. Change default status from 'new' to 'pending' for new submissions
ALTER TABLE public.exhibitor_inquiries ALTER COLUMN status SET DEFAULT 'pending';

-- 2. Create blocked_inquiry_emails table
CREATE TABLE IF NOT EXISTS public.blocked_inquiry_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  reason text,
  blocked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on blocked_inquiry_emails
ALTER TABLE public.blocked_inquiry_emails ENABLE ROW LEVEL SECURITY;

-- Only admins/CS/PM can manage blocked emails
CREATE POLICY "Admins, CS, and PM can manage blocked emails"
  ON public.blocked_inquiry_emails
  FOR ALL
  USING (is_admin_or_cs_or_pm(auth.uid()))
  WITH CHECK (is_admin_or_cs_or_pm(auth.uid()));

-- 3. Create trigger to auto-reject inquiries when an email is blocked
CREATE OR REPLACE FUNCTION public.auto_reject_blocked_inquiries()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE exhibitor_inquiries
  SET status = 'rejected', updated_at = now()
  WHERE visitor_email = NEW.email
    AND status IN ('pending', 'new');
  RETURN NEW;
END;
$function$;

CREATE TRIGGER auto_reject_blocked_inquiries
  AFTER INSERT ON public.blocked_inquiry_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_reject_blocked_inquiries();

-- 4. Fix RLS: Exhibitors should NOT see pending or rejected inquiries
-- Drop existing exhibitor SELECT policy
DROP POLICY IF EXISTS "Exhibitors can view their own inquiries" ON public.exhibitor_inquiries;

-- Recreate with status filter
CREATE POLICY "Exhibitors can view their own inquiries"
  ON public.exhibitor_inquiries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exhibitors
      WHERE exhibitors.id = exhibitor_inquiries.exhibitor_id
        AND exhibitors.user_id = auth.uid()
    )
    AND status NOT IN ('pending', 'rejected')
  );

-- Also fix the exhibitor UPDATE policy to exclude pending/rejected
DROP POLICY IF EXISTS "Exhibitors can update their own inquiry status" ON public.exhibitor_inquiries;

CREATE POLICY "Exhibitors can update their own inquiry status"
  ON public.exhibitor_inquiries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM exhibitors
      WHERE exhibitors.id = exhibitor_inquiries.exhibitor_id
        AND exhibitors.user_id = auth.uid()
    )
    AND status NOT IN ('pending', 'rejected')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exhibitors
      WHERE exhibitors.id = exhibitor_inquiries.exhibitor_id
        AND exhibitors.user_id = auth.uid()
    )
    AND status NOT IN ('pending', 'rejected')
  );
