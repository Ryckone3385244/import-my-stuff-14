
-- Helper function for RLS: checks if user has access via exhibitors.user_id OR exhibitor_contacts.user_id
CREATE OR REPLACE FUNCTION public.user_has_exhibitor_access(_user_id uuid, _exhibitor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM exhibitors WHERE id = _exhibitor_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM exhibitor_contacts 
    WHERE exhibitor_id = _exhibitor_id AND user_id = _user_id AND is_active = true
  )
$$;
