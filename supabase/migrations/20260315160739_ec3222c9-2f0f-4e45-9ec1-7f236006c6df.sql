
-- PART 4: Enable RLS on all tables
ALTER TABLE public.agenda_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibitor_address ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibitor_advert_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibitor_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibitor_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibitor_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibitor_social_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibitor_speaker_headshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibitor_speaker_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.footer_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_html_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navbar_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_section_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_column_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_setup_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_inquiry_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.element_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.element_motion ENABLE ROW LEVEL SECURITY;

-- Now create the function that depends on exhibitors table
CREATE OR REPLACE FUNCTION public.user_has_exhibitor_access(_user_id uuid, _exhibitor_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
    AS $$ SELECT EXISTS (SELECT 1 FROM exhibitors WHERE id = _exhibitor_id AND user_id = _user_id) OR EXISTS (SELECT 1 FROM exhibitor_contacts WHERE exhibitor_id = _exhibitor_id AND user_id = _user_id AND is_active = true) $$;
