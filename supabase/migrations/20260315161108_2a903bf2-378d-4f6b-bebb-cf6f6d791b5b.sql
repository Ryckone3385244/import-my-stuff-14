
-- Create the missing function
CREATE OR REPLACE FUNCTION public.auto_reject_blocked_inquiries() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
    AS $function$ BEGIN UPDATE exhibitor_inquiries SET status = 'rejected', updated_at = now() WHERE visitor_email = NEW.email AND status IN ('pending', 'new'); RETURN NEW; END; $function$;

-- Create remaining trigger
CREATE TRIGGER auto_reject_blocked_inquiries AFTER INSERT ON public.blocked_inquiry_emails FOR EACH ROW EXECUTE FUNCTION public.auto_reject_blocked_inquiries();

-- Views
CREATE OR REPLACE VIEW public.public_event_settings WITH (security_invoker='true') AS
 SELECT id, event_name, tagline, logo_url, event_date, location, thumbnail_url, event_status,
    address_line_1, address_line_2, address_line_3, organiser_info, copyright_text,
    showguide_listing_deadline, space_only_deadline, speaker_form_deadline, advert_submission_deadline,
    created_at, updated_at FROM public.event_settings LIMIT 1;

CREATE OR REPLACE VIEW public.suppliers_directory WITH (security_invoker='true') AS
 SELECT id, created_at, updated_at, name, description, logo_url, button_text, button_url FROM public.show_suppliers;

DROP VIEW IF EXISTS public.speakers_public;
CREATE VIEW public.speakers_public AS
SELECT id, name, bio, photo_url, title, company, company_logo_url, linkedin_url, seminar_title, seminar_description, is_active, created_at, updated_at FROM public.speakers;
GRANT SELECT ON public.speakers_public TO anon, authenticated;

-- Seed data
INSERT INTO public.event_settings (event_name, tagline, event_date, location) VALUES ('Grab and Go Expo', 'The leading Food-To-Go industry event', '29 & 30 September 2026', 'ExCel London');

INSERT INTO public.seo_redirects (from_path, to_path, is_pattern) VALUES
  ('/attend', '/registration', false), ('/register', '/registration', false),
  ('/floor-plan', '/floorplan', false), ('/blog', '/news', false),
  ('/privacy', '/privacy-policy', false), ('/terms', '/terms-conditions', false)
ON CONFLICT (from_path) DO NOTHING;
