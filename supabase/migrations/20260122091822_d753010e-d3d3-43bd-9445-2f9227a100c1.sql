-- Bi-directional sync between event_settings deadline fields and email_deadlines table
-- Safe to run multiple times on any remix

-- Step 1: Migrate existing data from email_deadlines to event_settings (only if NULL)
UPDATE event_settings es
SET 
  showguide_listing_deadline = COALESCE(es.showguide_listing_deadline, (
    SELECT deadline_date FROM email_deadlines 
    WHERE LOWER(label) LIKE '%profile%' OR LOWER(label) LIKE '%listing%' OR LOWER(label) LIKE '%showguide%'
    ORDER BY deadline_date ASC LIMIT 1
  )),
  space_only_deadline = COALESCE(es.space_only_deadline, (
    SELECT deadline_date FROM email_deadlines 
    WHERE LOWER(label) LIKE '%stand%' OR LOWER(label) LIKE '%space%' OR LOWER(label) LIKE '%booth%'
    ORDER BY deadline_date ASC LIMIT 1
  )),
  speaker_form_deadline = COALESCE(es.speaker_form_deadline, (
    SELECT deadline_date FROM email_deadlines 
    WHERE LOWER(label) LIKE '%speaker%' OR LOWER(label) LIKE '%session%'
    ORDER BY deadline_date ASC LIMIT 1
  )),
  advert_submission_deadline = COALESCE(es.advert_submission_deadline, (
    SELECT deadline_date FROM email_deadlines 
    WHERE LOWER(label) LIKE '%marketing%' OR LOWER(label) LIKE '%advert%' OR LOWER(label) LIKE '%material%'
    ORDER BY deadline_date ASC LIMIT 1
  ))
WHERE es.id = (SELECT id FROM event_settings LIMIT 1);

-- Step 2: Create helper function to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_syncing_deadlines()
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(current_setting('app.syncing_deadlines', true), 'false') = 'true';
END;
$$;

-- Step 3: Create function to sync FROM event_settings TO email_deadlines
CREATE OR REPLACE FUNCTION public.sync_event_settings_to_email_deadlines()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_syncing_deadlines() THEN RETURN NEW; END IF;
  PERFORM set_config('app.syncing_deadlines', 'true', true);
  
  IF NEW.showguide_listing_deadline IS DISTINCT FROM OLD.showguide_listing_deadline THEN
    UPDATE email_deadlines SET deadline_date = NEW.showguide_listing_deadline, updated_at = now()
    WHERE LOWER(label) LIKE '%profile%' OR LOWER(label) LIKE '%listing%' OR LOWER(label) LIKE '%showguide%';
  END IF;
  
  IF NEW.space_only_deadline IS DISTINCT FROM OLD.space_only_deadline THEN
    UPDATE email_deadlines SET deadline_date = NEW.space_only_deadline, updated_at = now()
    WHERE LOWER(label) LIKE '%stand%' OR LOWER(label) LIKE '%space%' OR LOWER(label) LIKE '%booth%';
  END IF;
  
  IF NEW.speaker_form_deadline IS DISTINCT FROM OLD.speaker_form_deadline THEN
    UPDATE email_deadlines SET deadline_date = NEW.speaker_form_deadline, updated_at = now()
    WHERE LOWER(label) LIKE '%speaker%' OR LOWER(label) LIKE '%session%';
  END IF;
  
  IF NEW.advert_submission_deadline IS DISTINCT FROM OLD.advert_submission_deadline THEN
    UPDATE email_deadlines SET deadline_date = NEW.advert_submission_deadline, updated_at = now()
    WHERE LOWER(label) LIKE '%marketing%' OR LOWER(label) LIKE '%advert%' OR LOWER(label) LIKE '%material%';
  END IF;
  
  PERFORM set_config('app.syncing_deadlines', 'false', true);
  RETURN NEW;
END;
$$;

-- Step 4: Create function to sync FROM email_deadlines TO event_settings
CREATE OR REPLACE FUNCTION public.sync_email_deadlines_to_event_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_syncing_deadlines() THEN RETURN NEW; END IF;
  PERFORM set_config('app.syncing_deadlines', 'true', true);
  
  IF LOWER(NEW.label) LIKE '%profile%' OR LOWER(NEW.label) LIKE '%listing%' OR LOWER(NEW.label) LIKE '%showguide%' THEN
    UPDATE event_settings SET showguide_listing_deadline = NEW.deadline_date, updated_at = now();
  ELSIF LOWER(NEW.label) LIKE '%stand%' OR LOWER(NEW.label) LIKE '%space%' OR LOWER(NEW.label) LIKE '%booth%' THEN
    UPDATE event_settings SET space_only_deadline = NEW.deadline_date, updated_at = now();
  ELSIF LOWER(NEW.label) LIKE '%speaker%' OR LOWER(NEW.label) LIKE '%session%' THEN
    UPDATE event_settings SET speaker_form_deadline = NEW.deadline_date, updated_at = now();
  ELSIF LOWER(NEW.label) LIKE '%marketing%' OR LOWER(NEW.label) LIKE '%advert%' OR LOWER(NEW.label) LIKE '%material%' THEN
    UPDATE event_settings SET advert_submission_deadline = NEW.deadline_date, updated_at = now();
  END IF;
  
  PERFORM set_config('app.syncing_deadlines', 'false', true);
  RETURN NEW;
END;
$$;

-- Step 5: Create triggers (drop first if exist)
DROP TRIGGER IF EXISTS sync_to_email_deadlines ON event_settings;
CREATE TRIGGER sync_to_email_deadlines
  AFTER UPDATE ON event_settings
  FOR EACH ROW EXECUTE FUNCTION sync_event_settings_to_email_deadlines();

DROP TRIGGER IF EXISTS sync_to_event_settings ON email_deadlines;
CREATE TRIGGER sync_to_event_settings
  AFTER UPDATE ON email_deadlines
  FOR EACH ROW EXECUTE FUNCTION sync_email_deadlines_to_event_settings();