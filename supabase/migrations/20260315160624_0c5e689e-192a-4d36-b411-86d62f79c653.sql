
-- PART 2B: Functions that don't reference missing tables were already created.
-- Now create all core tables.

-- page_status enum
DO $$ BEGIN CREATE TYPE public.page_status AS ENUM ('published', 'draft'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- agenda_sessions
CREATE TABLE IF NOT EXISTS public.agenda_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title text NOT NULL, description text, session_date date NOT NULL,
    start_time time NOT NULL, end_time time NOT NULL, venue text NOT NULL,
    room text, session_type text, capacity integer,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    status text DEFAULT 'published' NOT NULL CHECK (status IN ('draft','published'))
);

-- blog_posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title text NOT NULL, slug text NOT NULL UNIQUE, excerpt text, content text NOT NULL,
    featured_image_url text, author_id uuid, status text DEFAULT 'draft' NOT NULL,
    published_at timestamptz, created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL, seo_title text, seo_description text, tags text[]
);

-- customer_managers
CREATE TABLE IF NOT EXISTS public.customer_managers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL, role text DEFAULT 'Customer Service Manager' NOT NULL,
    email text NOT NULL, phone text NOT NULL, meeting_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    show_email boolean NOT NULL DEFAULT true, show_calendly boolean NOT NULL DEFAULT true
);

-- event_settings
CREATE TABLE IF NOT EXISTS public.event_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    event_name text DEFAULT 'Grab and Go Expo' NOT NULL, tagline text DEFAULT 'The leading Food-To-Go industry event' NOT NULL,
    logo_url text, event_date text DEFAULT '29 & 30 September 2026' NOT NULL,
    location text DEFAULT 'ExCel London' NOT NULL, thumbnail_url text,
    event_status text DEFAULT 'upcoming' NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    address_line_1 text DEFAULT 'One Western Gateway', address_line_2 text DEFAULT 'Royal Victoria Dock',
    address_line_3 text DEFAULT 'London E16 1XL',
    organiser_info text DEFAULT 'An event organised by Fortem Food And Drink Ltd. Company Registered in England No. 09810978.',
    copyright_text text DEFAULT '© 2025 - 2026 Grab & Go Expo. All rights reserved.',
    showguide_listing_deadline date, space_only_deadline date, speaker_form_deadline date, advert_submission_deadline date,
    facebook_url text, twitter_url text, linkedin_url text, instagram_url text, youtube_url text, tiktok_url text,
    ticker_enabled boolean DEFAULT false, ticker_text text, ticker_link_text text, ticker_link_url text,
    popup_enabled boolean DEFAULT false, popup_image_url text, popup_link_url text,
    register_interest_form_embed text, register_event_form_embed text, exhibitor_form_embed text,
    floorplan_url text, resend_from_name text DEFAULT 'Customer Connect Expo', resend_from_domain text DEFAULT 'fortemevents.com',
    contact_email text, contact_phone text, event_domain text, favicon_url text
);

-- exhibitors
CREATE TABLE IF NOT EXISTS public.exhibitors (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL, description text, logo_url text, website text, booth_number text, category text,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    banner_url text, company_profile text, short_description text, account_number text,
    is_active boolean DEFAULT true NOT NULL, stand_type text, booth_length numeric, booth_width numeric,
    open_sides integer, event_status text DEFAULT 'pending', showguide_entry text,
    speaking_session boolean DEFAULT false, speaking_session_details text,
    advertisement boolean DEFAULT false, advertisement_details text,
    show_contact_button boolean DEFAULT true NOT NULL,
    approval_status text DEFAULT 'approved' CHECK (approval_status IN ('approved','pending_approval','rejected')),
    pending_changes jsonb, submitted_for_approval_at timestamptz,
    speaker_submission_approved boolean DEFAULT false, headshot_submission_approved boolean DEFAULT false,
    advert_submission_approved boolean DEFAULT false,
    meta_title text, meta_description text,
    CONSTRAINT exhibitors_stand_type_check CHECK (stand_type IN ('Pipe and Drape','Shell','Space only'))
);

-- exhibitor_contacts
CREATE TABLE IF NOT EXISTS public.exhibitor_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    exhibitor_id uuid NOT NULL REFERENCES public.exhibitors(id) ON DELETE CASCADE,
    full_name text NOT NULL, email text NOT NULL, telephone text, job_title text,
    profile_picture_url text, is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    is_main_contact boolean DEFAULT false NOT NULL,
    approval_status text DEFAULT 'approved', pending_changes jsonb, submitted_for_approval_at timestamptz,
    user_id uuid,
    CONSTRAINT exhibitor_contacts_approval_status_check CHECK (approval_status IN ('approved','pending_approval','rejected'))
);

-- exhibitor_address
CREATE TABLE IF NOT EXISTS public.exhibitor_address (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    exhibitor_id uuid NOT NULL UNIQUE REFERENCES public.exhibitors(id) ON DELETE CASCADE,
    street_line_1 text, city text, postcode text, country text,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    approval_status text DEFAULT 'approved', pending_changes jsonb, submitted_for_approval_at timestamptz,
    CONSTRAINT exhibitor_address_approval_status_check CHECK (approval_status IN ('approved','pending_approval','rejected'))
);

-- exhibitor_products
CREATE TABLE IF NOT EXISTS public.exhibitor_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    exhibitor_id uuid NOT NULL REFERENCES public.exhibitors(id) ON DELETE CASCADE,
    product_name text NOT NULL, description text, image_url text,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    approval_status text DEFAULT 'approved', pending_changes jsonb, submitted_for_approval_at timestamptz,
    CONSTRAINT exhibitor_products_approval_status_check CHECK (approval_status IN ('approved','pending_approval','rejected'))
);

-- exhibitor_social_media
CREATE TABLE IF NOT EXISTS public.exhibitor_social_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    exhibitor_id uuid NOT NULL UNIQUE REFERENCES public.exhibitors(id) ON DELETE CASCADE,
    facebook text, instagram text, linkedin text, tiktok text, youtube text,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    approval_status text DEFAULT 'approved', pending_changes jsonb, submitted_for_approval_at timestamptz,
    CONSTRAINT exhibitor_social_media_approval_status_check CHECK (approval_status IN ('approved','pending_approval','rejected'))
);

-- exhibitor_inquiries
CREATE TABLE IF NOT EXISTS public.exhibitor_inquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    exhibitor_id uuid NOT NULL REFERENCES public.exhibitors(id) ON DELETE CASCADE,
    visitor_name text NOT NULL, visitor_email text NOT NULL, visitor_company text, visitor_phone text,
    message text NOT NULL, status text DEFAULT 'pending' NOT NULL,
    admin_notes text,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT exhibitor_inquiries_status_check CHECK (status IN ('pending','new','read','responded','rejected','archived'))
);

-- exhibitor_speaker_submissions
CREATE TABLE IF NOT EXISTS public.exhibitor_speaker_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    exhibitor_id uuid NOT NULL REFERENCES public.exhibitors(id) ON DELETE CASCADE,
    file_url text NOT NULL, file_name text NOT NULL, file_type text NOT NULL,
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
    approval_status text DEFAULT 'pending_approval', extracted_data jsonb
);

-- exhibitor_speaker_headshots
CREATE TABLE IF NOT EXISTS public.exhibitor_speaker_headshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    exhibitor_id uuid NOT NULL REFERENCES public.exhibitors(id) ON DELETE CASCADE,
    file_url text NOT NULL, file_name text NOT NULL, file_type text NOT NULL,
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
    approval_status text DEFAULT 'pending_approval'
);

-- exhibitor_advert_submissions
CREATE TABLE IF NOT EXISTS public.exhibitor_advert_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    exhibitor_id uuid NOT NULL REFERENCES public.exhibitors(id) ON DELETE CASCADE,
    file_url text NOT NULL, file_name text NOT NULL, file_type text NOT NULL,
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
    approval_status text DEFAULT 'pending_approval'
);

-- speakers
CREATE TABLE IF NOT EXISTS public.speakers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL, bio text, photo_url text, title text, company text, linkedin_url text,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    company_logo_url text, seminar_title text, seminar_description text,
    user_id uuid REFERENCES auth.users(id), is_active boolean DEFAULT true,
    email text, phone text, event_id uuid
);

-- speaker_submissions
CREATE TABLE IF NOT EXISTS public.speaker_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    speaker_id uuid NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    pdf_url text NOT NULL, pdf_filename text NOT NULL, extracted_data jsonb,
    approval_status text DEFAULT 'pending_approval',
    reviewed_by uuid REFERENCES auth.users(id), reviewed_at timestamptz, admin_notes text,
    CONSTRAINT speaker_submissions_approval_status_check CHECK (approval_status IN ('pending_approval','approved','rejected'))
);

-- draft_sessions
CREATE TABLE IF NOT EXISTS public.draft_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    speaker_id uuid NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL,
    seminar_title text NOT NULL, seminar_description text,
    status text DEFAULT 'draft', session_date date, start_time time, end_time time,
    venue text, room text, session_type text,
    published_session_id uuid REFERENCES public.agenda_sessions(id), admin_notes text,
    CONSTRAINT draft_sessions_status_check CHECK (status IN ('draft','scheduled','published','rejected'))
);

-- session_speakers
CREATE TABLE IF NOT EXISTS public.session_speakers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    session_id uuid NOT NULL REFERENCES public.agenda_sessions(id) ON DELETE CASCADE,
    speaker_id uuid NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
    speaker_order integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(session_id, speaker_id)
);
