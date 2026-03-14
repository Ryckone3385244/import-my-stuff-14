
-- Task 1: CRM display controls - add show_email and show_calendly toggles
ALTER TABLE public.customer_managers
  ADD COLUMN IF NOT EXISTS show_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_calendly boolean NOT NULL DEFAULT true;

-- Task 3: Fix validate_exhibitor_update trigger - treat empty string same as NULL for logo/banner
CREATE OR REPLACE FUNCTION public.validate_exhibitor_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow service role to update anything (used by edge functions)
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Admins, CS, and PM can update anything
  IF is_admin_or_cs_or_pm(auth.uid()) THEN
    RETURN NEW;
  END IF;
  
  -- For exhibitors updating their own records
  IF auth.uid() = NEW.user_id THEN
    -- Allow approval workflow updates
    IF NEW.approval_status = 'pending_approval' AND NEW.pending_changes IS NOT NULL THEN
      RETURN NEW;
    END IF;
    
    -- Helper: treat empty string as NULL for comparison (first-time uploads)
    -- This allows exhibitors to set logo/banner for the first time without approval
    -- Block direct updates to protected fields
    IF (OLD.name IS DISTINCT FROM NEW.name
       OR OLD.short_description IS DISTINCT FROM NEW.short_description
       OR OLD.company_profile IS DISTINCT FROM NEW.company_profile
       OR OLD.showguide_entry IS DISTINCT FROM NEW.showguide_entry
       OR OLD.website IS DISTINCT FROM NEW.website
       OR OLD.booth_number IS DISTINCT FROM NEW.booth_number
       OR (NULLIF(OLD.logo_url, '') IS DISTINCT FROM NULLIF(NEW.logo_url, '') AND NULLIF(OLD.logo_url, '') IS NOT NULL)
       OR (NULLIF(OLD.banner_url, '') IS DISTINCT FROM NULLIF(NEW.banner_url, '') AND NULLIF(OLD.banner_url, '') IS NOT NULL)
       OR OLD.description IS DISTINCT FROM NEW.description
       OR OLD.category IS DISTINCT FROM NEW.category
       OR OLD.show_contact_button IS DISTINCT FROM NEW.show_contact_button)
    THEN
      RAISE EXCEPTION 'Direct updates not allowed. Changes must go through approval workflow.';
    END IF;
    
    RETURN NEW;
  END IF;
  
  RAISE EXCEPTION 'No permission to update';
END;
$function$;
