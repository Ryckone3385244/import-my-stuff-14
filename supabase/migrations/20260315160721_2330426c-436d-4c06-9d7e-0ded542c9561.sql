
-- PART 3: Remaining tables

-- email_deadlines
CREATE TABLE IF NOT EXISTS public.email_deadlines (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    label text NOT NULL, deadline_date date NOT NULL, description text NOT NULL,
    deadline_order integer DEFAULT 0 NOT NULL, is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL
);

-- email_templates
CREATE TABLE IF NOT EXISTS public.email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    template_type text NOT NULL, banner_image_url text,
    welcome_text text DEFAULT '<p>We''re excited to have you as part of our upcoming event!</p>' NOT NULL,
    portal_url text NOT NULL, is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    subject text DEFAULT 'Important Information',
    banner_background_color text DEFAULT '142 86% 28%',
    page_background_color text DEFAULT '0 0% 98%'
);

-- navbar_menu_items
CREATE TABLE IF NOT EXISTS public.navbar_menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    label text NOT NULL, url text NOT NULL, menu_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    parent_id uuid REFERENCES public.navbar_menu_items(id) ON DELETE CASCADE,
    depth integer DEFAULT 0 NOT NULL, is_custom boolean DEFAULT false NOT NULL,
    open_in_new_tab boolean NOT NULL DEFAULT false
);

-- footer_menu_items
CREATE TABLE IF NOT EXISTS public.footer_menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    label text NOT NULL, url text NOT NULL, menu_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    parent_id uuid REFERENCES public.footer_menu_items(id) ON DELETE CASCADE,
    depth integer DEFAULT 0 NOT NULL, is_custom boolean DEFAULT false NOT NULL,
    open_in_new_tab boolean NOT NULL DEFAULT false
);

-- portal_menu_items
CREATE TABLE IF NOT EXISTS public.portal_menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    label text NOT NULL, url text NOT NULL, menu_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    parent_id uuid REFERENCES public.portal_menu_items(id) ON DELETE CASCADE,
    depth integer DEFAULT 0 NOT NULL, is_custom boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    open_in_new_tab boolean NOT NULL DEFAULT false
);

-- page_content
CREATE TABLE IF NOT EXISTS public.page_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    page_name text NOT NULL, section_name text NOT NULL, content_key text NOT NULL,
    content_value text NOT NULL, content_type text DEFAULT 'text' NOT NULL,
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
    UNIQUE (page_name, section_name, content_key)
);

-- page_section_order
CREATE TABLE IF NOT EXISTS public.page_section_order (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    page_name text NOT NULL, section_id text NOT NULL, section_order integer NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    visible boolean DEFAULT true NOT NULL, status text DEFAULT 'published' NOT NULL,
    background_type text DEFAULT 'none', background_value text,
    no_mobile_swap boolean DEFAULT false,
    UNIQUE (page_name, section_id),
    CONSTRAINT page_section_order_background_type_check CHECK (background_type IN ('none','color','image','gradient')),
    CONSTRAINT page_section_order_status_check CHECK (status IN ('draft','published'))
);

-- section_column_order
CREATE TABLE IF NOT EXISTS public.section_column_order (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    page_name text NOT NULL, section_id text NOT NULL, column_id text NOT NULL,
    column_order integer NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    visible boolean DEFAULT true NOT NULL, card_color text DEFAULT 'none',
    show_border boolean DEFAULT false, vertical_align text DEFAULT 'top',
    column_width text DEFAULT NULL,
    UNIQUE (page_name, section_id, column_id),
    CONSTRAINT section_column_order_vertical_align_check CHECK (vertical_align IN ('top','center'))
);

-- page_views
CREATE TABLE IF NOT EXISTS public.page_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    session_id text NOT NULL, page_path text NOT NULL, page_title text,
    viewed_at timestamptz DEFAULT now() NOT NULL, time_on_page integer,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- visitor_sessions
CREATE TABLE IF NOT EXISTS public.visitor_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    session_id text NOT NULL UNIQUE, first_seen timestamptz DEFAULT now() NOT NULL,
    last_seen timestamptz DEFAULT now() NOT NULL, referrer text, user_agent text,
    country text, city text, device_type text, browser text, os text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- registrations
CREATE TABLE IF NOT EXISTS public.registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL, email text NOT NULL UNIQUE, company text NOT NULL,
    role text NOT NULL, created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
    phone text, interest_type text DEFAULT 'general', has_accessed_floorplan boolean DEFAULT false,
    CONSTRAINT registrations_company_length CHECK (char_length(company) <= 100),
    CONSTRAINT registrations_email_length CHECK (char_length(email) <= 255),
    CONSTRAINT registrations_name_length CHECK (char_length(name) <= 100),
    CONSTRAINT registrations_role_check CHECK (role IN ('buyer','brand','supplier','influencer','other'))
);

-- website_pages
CREATE TABLE IF NOT EXISTS public.website_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    page_name text NOT NULL, page_url text NOT NULL UNIQUE,
    seo_title text, seo_description text, seo_keywords text, thumbnail_url text, tags text[],
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    status public.page_status DEFAULT 'published' NOT NULL,
    renderer text DEFAULT 'dynamic'
);

-- website_styles
CREATE TABLE IF NOT EXISTS public.website_styles (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    primary_color text DEFAULT '142 86% 28%', secondary_color text DEFAULT '142 77% 73%',
    accent_color text DEFAULT '142 86% 28%', background_color text DEFAULT '0 0% 100%',
    foreground_color text DEFAULT '240 10% 3.9%', muted_color text DEFAULT '240 4.8% 95.9%',
    font_family_heading text DEFAULT 'Inter', font_family_body text DEFAULT 'Inter',
    google_fonts_url text DEFAULT '', h1_size text DEFAULT '2.25rem', h2_size text DEFAULT '1.875rem',
    h3_size text DEFAULT '1.5rem', h4_size text DEFAULT '1.25rem', h5_size text DEFAULT '1.125rem',
    h6_size text DEFAULT '1rem', created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    gradient_start_color text DEFAULT '140 80% 50%', gradient_end_color text DEFAULT '143 75% 41%',
    card_background_color text DEFAULT '0 0% 100%', card_text_color text DEFAULT '0 0% 5%',
    card_title_color text DEFAULT '0 0% 5%',
    green_card_background_color text DEFAULT '142 70% 45%', green_card_text_color text DEFAULT '0 0% 100%',
    green_card_title_color text DEFAULT '0 0% 100%',
    black_card_background_color text DEFAULT '0 0% 5%', black_card_text_color text DEFAULT '0 0% 100%',
    black_card_title_color text DEFAULT '0 0% 100%',
    border_radius text DEFAULT '0.5rem', button_font_size text DEFAULT '0.875rem',
    button_font_weight text DEFAULT '500', button_font_style text DEFAULT 'normal',
    card_padding text DEFAULT '1.5rem', button_color text DEFAULT '142 86% 28%',
    button_border text DEFAULT 'none', button_border_radius text DEFAULT '0.375rem',
    button_padding text DEFAULT '0.5rem 1rem', button_text_transform text DEFAULT 'uppercase',
    button_2_color text DEFAULT '0 0% 5%', button_2_border text DEFAULT 'none',
    button_2_border_radius text DEFAULT '0.375rem', button_2_padding text DEFAULT '0.5rem 1rem',
    button_2_font_size text DEFAULT '0.875rem', button_2_font_weight text DEFAULT '500',
    button_2_font_style text DEFAULT 'normal', button_2_text_transform text DEFAULT 'uppercase',
    image_border_radius text DEFAULT '0.5rem', image_padding text DEFAULT '0rem',
    adobe_fonts_url text,
    gray_card_background_color text DEFAULT '240 4.8% 95.9%', gray_card_text_color text DEFAULT '0 0% 5%',
    gray_card_title_color text DEFAULT '0 0% 5%', gradient_angle text DEFAULT '135deg',
    button_text_color text DEFAULT '0 0% 100%', button_2_text_color text DEFAULT '0 0% 100%',
    heading_text_transform text DEFAULT 'uppercase', hero_title_size text DEFAULT '3.5rem',
    navbar_menu_size text DEFAULT '0.875rem',
    transparent_card_text_color text, transparent_card_title_color text,
    hero_title_size_mobile text DEFAULT '2rem'
);

-- gallery_photos
CREATE TABLE IF NOT EXISTS public.gallery_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    photo_url text NOT NULL, photo_order integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

-- global_html_snippets
CREATE TABLE IF NOT EXISTS public.global_html_snippets (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    before_head_end text DEFAULT '', after_body_start text DEFAULT '', before_body_end text DEFAULT '',
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    custom_css text DEFAULT ''
);

-- marketing_tools
CREATE TABLE IF NOT EXISTS public.marketing_tools (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    tool_type text NOT NULL, title text, file_url text, file_name text,
    thumbnail_url text, social_platform text, social_url text
);

-- media_library
CREATE TABLE IF NOT EXISTS public.media_library (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    file_name text NOT NULL, file_url text NOT NULL, file_type text NOT NULL,
    mime_type text, file_size integer, width integer, height integer,
    uploaded_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    title text, description text, alt_text text
);

-- show_suppliers
CREATE TABLE IF NOT EXISTS public.show_suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL, description text, logo_url text,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    button_text text, button_url text
);

-- supplier_files
CREATE TABLE IF NOT EXISTS public.supplier_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    supplier_id uuid NOT NULL REFERENCES public.show_suppliers(id) ON DELETE CASCADE,
    file_name text NOT NULL, file_url text NOT NULL, file_size integer,
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

-- support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    ticket_number text NOT NULL UNIQUE, exhibitor_id uuid NOT NULL REFERENCES public.exhibitors(id) ON DELETE CASCADE,
    subject text NOT NULL, message text NOT NULL, attachment_urls text[] DEFAULT '{}',
    status text DEFAULT 'open' NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL
);

-- seo_redirects
CREATE TABLE IF NOT EXISTS public.seo_redirects (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    from_path text NOT NULL UNIQUE, to_path text NOT NULL,
    redirect_type text NOT NULL DEFAULT '301', is_pattern boolean NOT NULL DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL
);

-- password_setup_tokens
CREATE TABLE IF NOT EXISTS public.password_setup_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL, token text NOT NULL UNIQUE,
    user_type text NOT NULL CHECK (user_type IN ('exhibitor','speaker')),
    entity_id uuid NOT NULL, expires_at timestamptz NOT NULL,
    used_at timestamptz, created_at timestamptz DEFAULT now()
);

-- credentials_log
CREATE TABLE IF NOT EXISTS public.credentials_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    entity_type text NOT NULL, entity_id uuid NOT NULL, entity_name text NOT NULL,
    email text NOT NULL, password_plain text NOT NULL,
    generated_at timestamptz NOT NULL DEFAULT now(), generated_by uuid,
    generation_type text NOT NULL DEFAULT 'create',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- blocked_inquiry_emails
CREATE TABLE IF NOT EXISTS public.blocked_inquiry_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    email text NOT NULL, reason text, blocked_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- page_versions
CREATE TABLE IF NOT EXISTS public.page_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    page_name text NOT NULL, version_number integer DEFAULT 1,
    content_snapshot jsonb NOT NULL DEFAULT '[]', section_order_snapshot jsonb DEFAULT '[]',
    column_order_snapshot jsonb DEFAULT '[]',
    created_by uuid REFERENCES auth.users(id), created_at timestamptz DEFAULT now()
);

-- element_styles
CREATE TABLE IF NOT EXISTS public.element_styles (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    page_name text NOT NULL, element_id text NOT NULL, viewport text NOT NULL DEFAULT 'desktop',
    styles jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(page_name, element_id, viewport)
);

-- element_motion
CREATE TABLE IF NOT EXISTS public.element_motion (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    page_name text NOT NULL, element_id text NOT NULL,
    effect_type text NOT NULL DEFAULT 'none', effect_config jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(page_name, element_id)
);
