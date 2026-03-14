-- Enable the http extension for making HTTP requests from triggers
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Function to auto-create exhibitor credentials when main contact is set
CREATE OR REPLACE FUNCTION public.trigger_create_exhibitor_credentials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
  response extensions.http_response;
BEGIN
  -- Only trigger when a contact becomes main contact with a valid email
  IF NEW.is_main_contact = true AND NEW.email IS NOT NULL AND NEW.email != '' THEN
    -- Get environment variables
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_key := current_setting('app.settings.service_role_key', true);
    
    -- If settings not available, try to get from vault or skip
    IF supabase_url IS NULL OR service_key IS NULL THEN
      RAISE NOTICE 'Supabase URL or service key not configured, skipping auto-credential creation';
      RETURN NEW;
    END IF;
    
    -- Make HTTP POST to internal edge function
    BEGIN
      SELECT * INTO response FROM extensions.http_post(
        url := supabase_url || '/functions/v1/internal-create-exhibitor-credentials',
        body := json_build_object('exhibitorId', NEW.exhibitor_id)::text,
        content_type := 'application/json'
      );
      RAISE NOTICE 'Auto-credential trigger response: %', response.status;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Auto-credential trigger failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_main_contact_set ON public.exhibitor_contacts;

-- Create trigger for exhibitor contacts
CREATE TRIGGER on_main_contact_set
  AFTER INSERT OR UPDATE OF is_main_contact, email ON public.exhibitor_contacts
  FOR EACH ROW
  WHEN (NEW.is_main_contact = true)
  EXECUTE FUNCTION public.trigger_create_exhibitor_credentials();

-- Function to auto-create speaker credentials when email is set
CREATE OR REPLACE FUNCTION public.trigger_create_speaker_credentials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
  response extensions.http_response;
BEGIN
  -- Only trigger when email is set/changed and not null
  IF NEW.email IS NOT NULL AND NEW.email != '' AND 
     (OLD.email IS NULL OR OLD.email = '' OR OLD.email != NEW.email) THEN
    -- Get environment variables
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_key := current_setting('app.settings.service_role_key', true);
    
    -- If settings not available, skip
    IF supabase_url IS NULL OR service_key IS NULL THEN
      RAISE NOTICE 'Supabase URL or service key not configured, skipping auto-credential creation';
      RETURN NEW;
    END IF;
    
    -- Make HTTP POST to internal edge function
    BEGIN
      SELECT * INTO response FROM extensions.http_post(
        url := supabase_url || '/functions/v1/internal-create-speaker-credentials',
        body := json_build_object('speakerId', NEW.id)::text,
        content_type := 'application/json'
      );
      RAISE NOTICE 'Auto-credential trigger response: %', response.status;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Auto-credential trigger failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_speaker_email_set ON public.speakers;

-- Create trigger for speakers
CREATE TRIGGER on_speaker_email_set
  AFTER INSERT OR UPDATE OF email ON public.speakers
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_create_speaker_credentials();