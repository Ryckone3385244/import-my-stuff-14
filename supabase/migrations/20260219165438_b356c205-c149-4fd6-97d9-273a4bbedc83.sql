
-- Add user_id column to exhibitor_contacts for per-contact credentials
ALTER TABLE public.exhibitor_contacts ADD COLUMN user_id uuid;

-- Drop the old trigger that only fires for main contacts
DROP TRIGGER IF EXISTS on_main_contact_set ON public.exhibitor_contacts;

-- Create updated trigger function that handles per-contact credentials
CREATE OR REPLACE FUNCTION public.trigger_create_exhibitor_credentials()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
  response extensions.http_response;
BEGIN
  -- Trigger for ANY contact with a valid email (not just main contact)
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_key := current_setting('app.settings.service_role_key', true);
    
    IF supabase_url IS NULL OR service_key IS NULL THEN
      RAISE NOTICE 'Supabase URL or service key not configured, skipping auto-credential creation';
      RETURN NEW;
    END IF;
    
    -- Pass both exhibitorId and contactId to the edge function
    BEGIN
      SELECT * INTO response FROM extensions.http_post(
        url := supabase_url || '/functions/v1/internal-create-exhibitor-credentials',
        body := json_build_object(
          'exhibitorId', NEW.exhibitor_id,
          'contactId', NEW.id,
          'contactEmail', NEW.email,
          'isMainContact', NEW.is_main_contact
        )::text,
        content_type := 'application/json'
      );
      RAISE NOTICE 'Auto-credential trigger response for contact %: %', NEW.id, response.status;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Auto-credential trigger failed for contact %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create new trigger that fires for any contact with email changes
CREATE TRIGGER on_contact_email_set 
AFTER INSERT OR UPDATE OF email ON public.exhibitor_contacts
FOR EACH ROW 
WHEN (NEW.email IS NOT NULL AND NEW.email != '')
EXECUTE FUNCTION trigger_create_exhibitor_credentials();
