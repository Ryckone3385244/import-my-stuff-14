CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user',
    'exhibitor',
    'customer_service',
    'project_manager',
    'speaker'
);


--
-- Name: page_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.page_status AS ENUM (
    'published',
    'draft'
);


--
-- Name: check_user_role(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_user_role(check_user_id uuid, check_role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = check_user_id
      AND role = check_role::app_role
  )
$$;


--
-- Name: delete_speaker_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_speaker_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only delete the user if they exist and have a user_id
  IF OLD.user_id IS NOT NULL THEN
    -- Delete the user from auth.users
    DELETE FROM auth.users WHERE id = OLD.user_id;
  END IF;
  
  RETURN OLD;
END;
$$;


--
-- Name: generate_ticket_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_ticket_number() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  ticket_num TEXT;
  year_part TEXT;
  sequence_part TEXT;
BEGIN
  year_part := to_char(now(), 'YYYY');
  sequence_part := LPAD((SELECT COUNT(*) + 1 FROM support_tickets WHERE ticket_number LIKE year_part || '%')::TEXT, 6, '0');
  ticket_num := year_part || '-' || sequence_part;
  RETURN ticket_num;
END;
$$;


--
-- Name: get_storage_policies(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_storage_policies() RETURNS TABLE(policy_name text, policy_command text, policy_permissive text, policy_roles text[], policy_qual text, policy_with_check text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
  SELECT 
    pol.polname::TEXT as policy_name,
    CASE pol.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
    END::TEXT as policy_command,
    CASE pol.polpermissive
      WHEN TRUE THEN 'PERMISSIVE'
      WHEN FALSE THEN 'RESTRICTIVE'
    END::TEXT as policy_permissive,
    ARRAY(
      SELECT rolname::TEXT 
      FROM pg_roles 
      WHERE oid = ANY(pol.polroles)
    ) as policy_roles,
    pg_get_expr(pol.polqual, pol.polrelid)::TEXT as policy_qual,
    pg_get_expr(pol.polwithcheck, pol.polrelid)::TEXT as policy_with_check
  FROM pg_policy pol
  JOIN pg_class cls ON pol.polrelid = cls.oid
  JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
  WHERE nsp.nspname = 'storage'
    AND cls.relname = 'objects';
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;


--
-- Name: is_admin_or_cs(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_or_cs(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'customer_service', 'project_manager')
  )
$$;


--
-- Name: is_admin_or_cs_or_pm(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_or_cs_or_pm(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'customer_service', 'project_manager')
  )
$$;


--
-- Name: is_exhibitor(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_exhibitor(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'exhibitor'
  )
$$;


--
-- Name: reset_submission_approval(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_submission_approval(p_exhibitor_id uuid, p_submission_type text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only allow admins, CS, and PM to reset approvals
  IF NOT is_admin_or_cs_or_pm(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can reset submission approvals';
  END IF;

  -- Update the appropriate approval flag
  IF p_submission_type = 'speaker' THEN
    UPDATE exhibitors
    SET speaker_submission_approved = false
    WHERE id = p_exhibitor_id;
  ELSIF p_submission_type = 'headshot' THEN
    UPDATE exhibitors
    SET headshot_submission_approved = false
    WHERE id = p_exhibitor_id;
  ELSIF p_submission_type = 'advert' THEN
    UPDATE exhibitors
    SET advert_submission_approved = false
    WHERE id = p_exhibitor_id;
  ELSE
    RAISE EXCEPTION 'Invalid submission type: %', p_submission_type;
  END IF;
END;
$$;


--
-- Name: set_ticket_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_ticket_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_page_content_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_page_content_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_section_column_order_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_section_column_order_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_visitor_last_seen(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_visitor_last_seen() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.last_seen = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_exhibitor_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_exhibitor_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Allow service role to update anything (used by edge functions)
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  RAISE WARNING 'NEW approval_status: %, NEW pending_changes: %', NEW.approval_status, NEW.pending_changes;
  RAISE WARNING 'Checking each field:';
  RAISE WARNING 'name: OLD=%, NEW=%', OLD.name, NEW.name;
  RAISE WARNING 'short_description: OLD=%, NEW=%', OLD.short_description, NEW.short_description;
  RAISE WARNING 'company_profile: OLD=%, NEW=%', OLD.company_profile, NEW.company_profile;
  RAISE WARNING 'website: OLD=%, NEW=%', OLD.website, NEW.website;
  RAISE WARNING 'logo_url: OLD=%, NEW=%', OLD.logo_url, NEW.logo_url;
  RAISE WARNING 'banner_url: OLD=%, NEW=%', OLD.banner_url, NEW.banner_url;

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
    
    -- Block direct updates to protected fields
    IF (OLD.name IS DISTINCT FROM NEW.name
       OR OLD.short_description IS DISTINCT FROM NEW.short_description
       OR OLD.company_profile IS DISTINCT FROM NEW.company_profile
       OR OLD.showguide_entry IS DISTINCT FROM NEW.showguide_entry
       OR OLD.website IS DISTINCT FROM NEW.website
       OR OLD.booth_number IS DISTINCT FROM NEW.booth_number
       OR OLD.logo_url IS DISTINCT FROM NEW.logo_url
       OR OLD.banner_url IS DISTINCT FROM NEW.banner_url
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
$$;


SET default_table_access_method = heap;

--
-- Name: agenda_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agenda_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    session_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    venue text NOT NULL,
    room text,
    session_type text,
    capacity integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'published'::text NOT NULL,
    CONSTRAINT agenda_sessions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    excerpt text,
    content text NOT NULL,
    featured_image_url text,
    author_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    seo_title text,
    seo_description text,
    tags text[]
);


--
-- Name: customer_managers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_managers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    role text DEFAULT 'Customer Service Manager'::text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    meeting_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: draft_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.draft_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    speaker_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    seminar_title text NOT NULL,
    seminar_description text,
    status text DEFAULT 'draft'::text,
    session_date date,
    start_time time without time zone,
    end_time time without time zone,
    venue text,
    room text,
    session_type text,
    published_session_id uuid,
    admin_notes text,
    CONSTRAINT draft_sessions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'published'::text, 'rejected'::text])))
);


--
-- Name: email_deadlines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_deadlines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    deadline_date date NOT NULL,
    description text NOT NULL,
    deadline_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_type text NOT NULL,
    banner_image_url text,
    welcome_text text DEFAULT '<p>We''re excited to have you as part of our upcoming event!</p><p>This email contains important information about your participation.</p>'::text NOT NULL,
    portal_url text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    subject text DEFAULT 'Important Information'::text,
    banner_background_color text DEFAULT '142 86% 28%'::text,
    page_background_color text DEFAULT '0 0% 98%'::text
);


--
-- Name: event_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_name text DEFAULT 'Grab and Go Expo'::text NOT NULL,
    tagline text DEFAULT 'The leading Food-To-Go industry event'::text NOT NULL,
    logo_url text,
    event_date text DEFAULT '29 & 30 September 2026'::text NOT NULL,
    location text DEFAULT 'ExCel London'::text NOT NULL,
    thumbnail_url text,
    event_status text DEFAULT 'upcoming'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    address_line_1 text DEFAULT 'One Western Gateway'::text,
    address_line_2 text DEFAULT 'Royal Victoria Dock'::text,
    address_line_3 text DEFAULT 'London E16 1XL'::text,
    organiser_info text DEFAULT 'An event organised by Fortem Food And Drink Ltd. Company Registered in England No. 09810978.'::text,
    copyright_text text DEFAULT '© 2025 - 2026 Grab & Go Expo. All rights reserved.'::text,
    showguide_listing_deadline date,
    space_only_deadline date,
    speaker_form_deadline date,
    advert_submission_deadline date,
    facebook_url text,
    twitter_url text,
    linkedin_url text,
    instagram_url text,
    youtube_url text,
    tiktok_url text
);


--
-- Name: exhibitor_address; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exhibitor_address (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exhibitor_id uuid NOT NULL,
    street_line_1 text,
    city text,
    postcode text,
    country text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    approval_status text DEFAULT 'approved'::text,
    pending_changes jsonb,
    submitted_for_approval_at timestamp with time zone,
    CONSTRAINT exhibitor_address_approval_status_check CHECK ((approval_status = ANY (ARRAY['approved'::text, 'pending_approval'::text, 'rejected'::text])))
);


--
-- Name: exhibitor_advert_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exhibitor_advert_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exhibitor_id uuid NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    approval_status text DEFAULT 'pending_approval'::text
);


--
-- Name: exhibitor_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exhibitor_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exhibitor_id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    telephone text,
    job_title text,
    profile_picture_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_main_contact boolean DEFAULT false NOT NULL,
    approval_status text DEFAULT 'approved'::text,
    pending_changes jsonb,
    submitted_for_approval_at timestamp with time zone,
    CONSTRAINT exhibitor_contacts_approval_status_check CHECK ((approval_status = ANY (ARRAY['approved'::text, 'pending_approval'::text, 'rejected'::text])))
);


--
-- Name: exhibitor_inquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exhibitor_inquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exhibitor_id uuid NOT NULL,
    visitor_name text NOT NULL,
    visitor_email text NOT NULL,
    visitor_company text,
    visitor_phone text,
    message text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT exhibitor_inquiries_status_check CHECK ((status = ANY (ARRAY['new'::text, 'read'::text, 'responded'::text, 'archived'::text])))
);


--
-- Name: exhibitor_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exhibitor_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exhibitor_id uuid NOT NULL,
    product_name text NOT NULL,
    description text,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    approval_status text DEFAULT 'approved'::text,
    pending_changes jsonb,
    submitted_for_approval_at timestamp with time zone,
    CONSTRAINT exhibitor_products_approval_status_check CHECK ((approval_status = ANY (ARRAY['approved'::text, 'pending_approval'::text, 'rejected'::text])))
);


--
-- Name: exhibitor_social_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exhibitor_social_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exhibitor_id uuid NOT NULL,
    facebook text,
    instagram text,
    linkedin text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tiktok text,
    youtube text,
    approval_status text DEFAULT 'approved'::text,
    pending_changes jsonb,
    submitted_for_approval_at timestamp with time zone,
    CONSTRAINT exhibitor_social_media_approval_status_check CHECK ((approval_status = ANY (ARRAY['approved'::text, 'pending_approval'::text, 'rejected'::text])))
);


--
-- Name: exhibitor_speaker_headshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exhibitor_speaker_headshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exhibitor_id uuid NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    approval_status text DEFAULT 'pending_approval'::text
);


--
-- Name: exhibitor_speaker_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exhibitor_speaker_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exhibitor_id uuid NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    approval_status text DEFAULT 'pending_approval'::text,
    extracted_data jsonb
);


--
-- Name: exhibitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exhibitors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    logo_url text,
    website text,
    booth_number text,
    category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    banner_url text,
    company_profile text,
    short_description text,
    account_number text,
    is_active boolean DEFAULT true NOT NULL,
    stand_type text,
    booth_length numeric,
    booth_width numeric,
    open_sides integer,
    event_status text DEFAULT 'pending'::text,
    showguide_entry text,
    speaking_session boolean DEFAULT false,
    speaking_session_details text,
    advertisement boolean DEFAULT false,
    advertisement_details text,
    show_contact_button boolean DEFAULT true NOT NULL,
    approval_status text DEFAULT 'approved'::text,
    pending_changes jsonb,
    submitted_for_approval_at timestamp with time zone,
    speaker_submission_approved boolean DEFAULT false,
    headshot_submission_approved boolean DEFAULT false,
    advert_submission_approved boolean DEFAULT false,
    CONSTRAINT exhibitors_approval_status_check CHECK ((approval_status = ANY (ARRAY['approved'::text, 'pending_approval'::text, 'rejected'::text]))),
    CONSTRAINT exhibitors_stand_type_check CHECK ((stand_type = ANY (ARRAY['Pipe and Drape'::text, 'Shell'::text, 'Space only'::text])))
);


--
-- Name: footer_menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.footer_menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    url text NOT NULL,
    menu_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_id uuid,
    depth integer DEFAULT 0 NOT NULL,
    is_custom boolean DEFAULT false NOT NULL
);


--
-- Name: gallery_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gallery_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    photo_url text NOT NULL,
    photo_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: global_html_snippets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_html_snippets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    before_head_end text DEFAULT ''::text,
    after_body_start text DEFAULT ''::text,
    before_body_end text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_css text DEFAULT ''::text
);


--
-- Name: marketing_tools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_tools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tool_type text NOT NULL,
    title text,
    file_url text,
    file_name text,
    thumbnail_url text,
    social_platform text,
    social_url text
);


--
-- Name: media_library; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_library (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_type text NOT NULL,
    mime_type text,
    file_size integer,
    width integer,
    height integer,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    title text,
    description text,
    alt_text text
);


--
-- Name: navbar_menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.navbar_menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    url text NOT NULL,
    menu_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_id uuid,
    depth integer DEFAULT 0 NOT NULL,
    is_custom boolean DEFAULT false NOT NULL
);


--
-- Name: page_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_name text NOT NULL,
    section_name text NOT NULL,
    content_key text NOT NULL,
    content_value text NOT NULL,
    content_type text DEFAULT 'text'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: page_section_order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_section_order (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_name text NOT NULL,
    section_id text NOT NULL,
    section_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    visible boolean DEFAULT true NOT NULL,
    status text DEFAULT 'published'::text NOT NULL,
    background_type text DEFAULT 'none'::text,
    background_value text,
    CONSTRAINT page_section_order_background_type_check CHECK ((background_type = ANY (ARRAY['none'::text, 'color'::text, 'image'::text, 'gradient'::text]))),
    CONSTRAINT page_section_order_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);


--
-- Name: page_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    page_path text NOT NULL,
    page_title text,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    time_on_page integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: portal_menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    url text NOT NULL,
    menu_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    parent_id uuid,
    depth integer DEFAULT 0 NOT NULL,
    is_custom boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: public_event_settings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.public_event_settings WITH (security_invoker='true') AS
 SELECT id,
    event_name,
    tagline,
    logo_url,
    event_date,
    location,
    thumbnail_url,
    event_status,
    address_line_1,
    address_line_2,
    address_line_3,
    organiser_info,
    copyright_text,
    showguide_listing_deadline,
    space_only_deadline,
    speaker_form_deadline,
    advert_submission_deadline,
    created_at,
    updated_at
   FROM public.event_settings
 LIMIT 1;


--
-- Name: registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    company text NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    phone text,
    interest_type text DEFAULT 'general'::text,
    has_accessed_floorplan boolean DEFAULT false,
    CONSTRAINT registrations_company_length CHECK ((char_length(company) <= 100)),
    CONSTRAINT registrations_email_length CHECK ((char_length(email) <= 255)),
    CONSTRAINT registrations_name_length CHECK ((char_length(name) <= 100)),
    CONSTRAINT registrations_role_check CHECK ((role = ANY (ARRAY['buyer'::text, 'brand'::text, 'supplier'::text, 'influencer'::text, 'other'::text])))
);


--
-- Name: section_column_order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.section_column_order (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_name text NOT NULL,
    section_id text NOT NULL,
    column_id text NOT NULL,
    column_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    visible boolean DEFAULT true NOT NULL,
    card_color text DEFAULT 'none'::text,
    show_border boolean DEFAULT false,
    vertical_align text DEFAULT 'top'::text,
    CONSTRAINT section_column_order_vertical_align_check CHECK ((vertical_align = ANY (ARRAY['top'::text, 'center'::text])))
);


--
-- Name: session_speakers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_speakers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    speaker_id uuid NOT NULL,
    speaker_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: show_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.show_suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    logo_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    button_text text,
    button_url text
);


--
-- Name: speaker_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.speaker_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    speaker_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pdf_url text NOT NULL,
    pdf_filename text NOT NULL,
    extracted_data jsonb,
    approval_status text DEFAULT 'pending_approval'::text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    admin_notes text,
    CONSTRAINT speaker_submissions_approval_status_check CHECK ((approval_status = ANY (ARRAY['pending_approval'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: speakers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.speakers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    bio text,
    photo_url text,
    title text,
    company text,
    linkedin_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    company_logo_url text,
    seminar_title text,
    seminar_description text,
    user_id uuid,
    is_active boolean DEFAULT true,
    email text,
    phone text
);


--
-- Name: supplier_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_size integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: suppliers_directory; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.suppliers_directory WITH (security_invoker='true') AS
 SELECT id,
    created_at,
    updated_at,
    name,
    description,
    logo_url,
    button_text,
    button_url
   FROM public.show_suppliers;


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_number text NOT NULL,
    exhibitor_id uuid NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    attachment_urls text[] DEFAULT '{}'::text[],
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    display_name text,
    meeting_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email text,
    phone text,
    role_title text DEFAULT 'Customer Service Manager'::text
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: visitor_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitor_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    first_seen timestamp with time zone DEFAULT now() NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    referrer text,
    user_agent text,
    country text,
    city text,
    device_type text,
    browser text,
    os text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: website_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.website_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_name text NOT NULL,
    page_url text NOT NULL,
    seo_title text,
    seo_description text,
    seo_keywords text,
    thumbnail_url text,
    tags text[],
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status public.page_status DEFAULT 'published'::public.page_status NOT NULL
);


--
-- Name: website_styles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.website_styles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    primary_color text DEFAULT '142 86% 28%'::text,
    secondary_color text DEFAULT '142 77% 73%'::text,
    accent_color text DEFAULT '142 86% 28%'::text,
    background_color text DEFAULT '0 0% 100%'::text,
    foreground_color text DEFAULT '240 10% 3.9%'::text,
    muted_color text DEFAULT '240 4.8% 95.9%'::text,
    font_family_heading text DEFAULT 'Inter'::text,
    font_family_body text DEFAULT 'Inter'::text,
    google_fonts_url text DEFAULT ''::text,
    h1_size text DEFAULT '2.25rem'::text,
    h2_size text DEFAULT '1.875rem'::text,
    h3_size text DEFAULT '1.5rem'::text,
    h4_size text DEFAULT '1.25rem'::text,
    h5_size text DEFAULT '1.125rem'::text,
    h6_size text DEFAULT '1rem'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gradient_start_color text DEFAULT '140 80% 50%'::text,
    gradient_end_color text DEFAULT '143 75% 41%'::text,
    card_background_color text DEFAULT '0 0% 100%'::text,
    card_text_color text DEFAULT '0 0% 5%'::text,
    card_title_color text DEFAULT '0 0% 5%'::text,
    green_card_background_color text DEFAULT '142 70% 45%'::text,
    green_card_text_color text DEFAULT '0 0% 100%'::text,
    green_card_title_color text DEFAULT '0 0% 100%'::text,
    black_card_background_color text DEFAULT '0 0% 5%'::text,
    black_card_text_color text DEFAULT '0 0% 100%'::text,
    black_card_title_color text DEFAULT '0 0% 100%'::text,
    border_radius text DEFAULT '0.5rem'::text,
    button_font_size text DEFAULT '0.875rem'::text,
    button_font_weight text DEFAULT '500'::text,
    button_font_style text DEFAULT 'normal'::text,
    card_padding text DEFAULT '1.5rem'::text,
    button_color text DEFAULT '142 86% 28%'::text,
    button_border text DEFAULT 'none'::text,
    button_border_radius text DEFAULT '0.375rem'::text,
    button_padding text DEFAULT '0.5rem 1rem'::text,
    button_text_transform text DEFAULT 'uppercase'::text,
    button_2_color text DEFAULT '0 0% 5%'::text,
    button_2_border text DEFAULT 'none'::text,
    button_2_border_radius text DEFAULT '0.375rem'::text,
    button_2_padding text DEFAULT '0.5rem 1rem'::text,
    button_2_font_size text DEFAULT '0.875rem'::text,
    button_2_font_weight text DEFAULT '500'::text,
    button_2_font_style text DEFAULT 'normal'::text,
    button_2_text_transform text DEFAULT 'uppercase'::text,
    image_border_radius text DEFAULT '0.5rem'::text,
    image_padding text DEFAULT '0rem'::text,
    adobe_fonts_url text,
    gray_card_background_color text DEFAULT '240 4.8% 95.9%'::text,
    gray_card_text_color text DEFAULT '0 0% 5%'::text,
    gray_card_title_color text DEFAULT '0 0% 5%'::text,
    gradient_angle text DEFAULT '135deg'::text
);


--
-- Name: agenda_sessions agenda_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_sessions
    ADD CONSTRAINT agenda_sessions_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);


--
-- Name: customer_managers customer_managers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_managers
    ADD CONSTRAINT customer_managers_pkey PRIMARY KEY (id);


--
-- Name: draft_sessions draft_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_sessions
    ADD CONSTRAINT draft_sessions_pkey PRIMARY KEY (id);


--
-- Name: email_deadlines email_deadlines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_deadlines
    ADD CONSTRAINT email_deadlines_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: event_settings event_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_settings
    ADD CONSTRAINT event_settings_pkey PRIMARY KEY (id);


--
-- Name: exhibitor_address exhibitor_address_exhibitor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_address
    ADD CONSTRAINT exhibitor_address_exhibitor_id_key UNIQUE (exhibitor_id);


--
-- Name: exhibitor_address exhibitor_address_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_address
    ADD CONSTRAINT exhibitor_address_pkey PRIMARY KEY (id);


--
-- Name: exhibitor_advert_submissions exhibitor_advert_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_advert_submissions
    ADD CONSTRAINT exhibitor_advert_submissions_pkey PRIMARY KEY (id);


--
-- Name: exhibitor_contacts exhibitor_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_contacts
    ADD CONSTRAINT exhibitor_contacts_pkey PRIMARY KEY (id);


--
-- Name: exhibitor_inquiries exhibitor_inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_inquiries
    ADD CONSTRAINT exhibitor_inquiries_pkey PRIMARY KEY (id);


--
-- Name: exhibitor_products exhibitor_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_products
    ADD CONSTRAINT exhibitor_products_pkey PRIMARY KEY (id);


--
-- Name: exhibitor_social_media exhibitor_social_media_exhibitor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_social_media
    ADD CONSTRAINT exhibitor_social_media_exhibitor_id_key UNIQUE (exhibitor_id);


--
-- Name: exhibitor_social_media exhibitor_social_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_social_media
    ADD CONSTRAINT exhibitor_social_media_pkey PRIMARY KEY (id);


--
-- Name: exhibitor_speaker_headshots exhibitor_speaker_headshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_speaker_headshots
    ADD CONSTRAINT exhibitor_speaker_headshots_pkey PRIMARY KEY (id);


--
-- Name: exhibitor_speaker_submissions exhibitor_speaker_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_speaker_submissions
    ADD CONSTRAINT exhibitor_speaker_submissions_pkey PRIMARY KEY (id);


--
-- Name: exhibitors exhibitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitors
    ADD CONSTRAINT exhibitors_pkey PRIMARY KEY (id);


--
-- Name: footer_menu_items footer_menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.footer_menu_items
    ADD CONSTRAINT footer_menu_items_pkey PRIMARY KEY (id);


--
-- Name: gallery_photos gallery_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gallery_photos
    ADD CONSTRAINT gallery_photos_pkey PRIMARY KEY (id);


--
-- Name: global_html_snippets global_html_snippets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_html_snippets
    ADD CONSTRAINT global_html_snippets_pkey PRIMARY KEY (id);


--
-- Name: marketing_tools marketing_tools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_tools
    ADD CONSTRAINT marketing_tools_pkey PRIMARY KEY (id);


--
-- Name: media_library media_library_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_library
    ADD CONSTRAINT media_library_pkey PRIMARY KEY (id);


--
-- Name: navbar_menu_items navbar_menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navbar_menu_items
    ADD CONSTRAINT navbar_menu_items_pkey PRIMARY KEY (id);


--
-- Name: page_content page_content_page_name_section_name_content_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_content
    ADD CONSTRAINT page_content_page_name_section_name_content_key_key UNIQUE (page_name, section_name, content_key);


--
-- Name: page_content page_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_content
    ADD CONSTRAINT page_content_pkey PRIMARY KEY (id);


--
-- Name: page_content page_content_unique_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_content
    ADD CONSTRAINT page_content_unique_key UNIQUE (page_name, section_name, content_key);


--
-- Name: page_section_order page_section_order_page_name_section_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_section_order
    ADD CONSTRAINT page_section_order_page_name_section_id_key UNIQUE (page_name, section_id);


--
-- Name: page_section_order page_section_order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_section_order
    ADD CONSTRAINT page_section_order_pkey PRIMARY KEY (id);


--
-- Name: page_views page_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_views
    ADD CONSTRAINT page_views_pkey PRIMARY KEY (id);


--
-- Name: portal_menu_items portal_menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_menu_items
    ADD CONSTRAINT portal_menu_items_pkey PRIMARY KEY (id);


--
-- Name: registrations registrations_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registrations
    ADD CONSTRAINT registrations_email_key UNIQUE (email);


--
-- Name: registrations registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registrations
    ADD CONSTRAINT registrations_pkey PRIMARY KEY (id);


--
-- Name: section_column_order section_column_order_page_name_section_id_column_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_column_order
    ADD CONSTRAINT section_column_order_page_name_section_id_column_id_key UNIQUE (page_name, section_id, column_id);


--
-- Name: section_column_order section_column_order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_column_order
    ADD CONSTRAINT section_column_order_pkey PRIMARY KEY (id);


--
-- Name: session_speakers session_speakers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_speakers
    ADD CONSTRAINT session_speakers_pkey PRIMARY KEY (id);


--
-- Name: session_speakers session_speakers_session_id_speaker_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_speakers
    ADD CONSTRAINT session_speakers_session_id_speaker_id_key UNIQUE (session_id, speaker_id);


--
-- Name: show_suppliers show_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.show_suppliers
    ADD CONSTRAINT show_suppliers_pkey PRIMARY KEY (id);


--
-- Name: speaker_submissions speaker_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaker_submissions
    ADD CONSTRAINT speaker_submissions_pkey PRIMARY KEY (id);


--
-- Name: speakers speakers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speakers
    ADD CONSTRAINT speakers_pkey PRIMARY KEY (id);


--
-- Name: supplier_files supplier_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_files
    ADD CONSTRAINT supplier_files_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_ticket_number_key UNIQUE (ticket_number);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);


--
-- Name: visitor_sessions visitor_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_sessions
    ADD CONSTRAINT visitor_sessions_pkey PRIMARY KEY (id);


--
-- Name: visitor_sessions visitor_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_sessions
    ADD CONSTRAINT visitor_sessions_session_id_key UNIQUE (session_id);


--
-- Name: website_pages website_pages_page_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_pages
    ADD CONSTRAINT website_pages_page_url_key UNIQUE (page_url);


--
-- Name: website_pages website_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_pages
    ADD CONSTRAINT website_pages_pkey PRIMARY KEY (id);


--
-- Name: website_styles website_styles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_styles
    ADD CONSTRAINT website_styles_pkey PRIMARY KEY (id);


--
-- Name: idx_agenda_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agenda_sessions_status ON public.agenda_sessions USING btree (status);


--
-- Name: idx_blog_posts_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_slug ON public.blog_posts USING btree (slug);


--
-- Name: idx_blog_posts_status_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_status_published ON public.blog_posts USING btree (status, published_at);


--
-- Name: idx_exhibitor_contacts_main; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exhibitor_contacts_main ON public.exhibitor_contacts USING btree (exhibitor_id, is_main_contact) WHERE (is_main_contact = true);


--
-- Name: idx_exhibitor_inquiries_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exhibitor_inquiries_created_at ON public.exhibitor_inquiries USING btree (created_at DESC);


--
-- Name: idx_exhibitor_inquiries_exhibitor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exhibitor_inquiries_exhibitor_id ON public.exhibitor_inquiries USING btree (exhibitor_id);


--
-- Name: idx_exhibitor_inquiries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exhibitor_inquiries_status ON public.exhibitor_inquiries USING btree (status);


--
-- Name: idx_exhibitors_account_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exhibitors_account_number ON public.exhibitors USING btree (account_number);


--
-- Name: idx_exhibitors_event_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exhibitors_event_status ON public.exhibitors USING btree (event_status);


--
-- Name: idx_exhibitors_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exhibitors_is_active ON public.exhibitors USING btree (is_active);


--
-- Name: idx_page_section_order_page; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_section_order_page ON public.page_section_order USING btree (page_name);


--
-- Name: idx_page_section_order_page_visible; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_section_order_page_visible ON public.page_section_order USING btree (page_name, visible);


--
-- Name: idx_page_views_page_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_views_page_path ON public.page_views USING btree (page_path);


--
-- Name: idx_page_views_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_views_session_id ON public.page_views USING btree (session_id);


--
-- Name: idx_page_views_viewed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_views_viewed_at ON public.page_views USING btree (viewed_at);


--
-- Name: idx_registrations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registrations_email ON public.registrations USING btree (email);


--
-- Name: idx_registrations_interest_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registrations_interest_type ON public.registrations USING btree (interest_type);


--
-- Name: idx_registrations_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registrations_role ON public.registrations USING btree (role);


--
-- Name: idx_support_tickets_exhibitor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_exhibitor_id ON public.support_tickets USING btree (exhibitor_id);


--
-- Name: idx_support_tickets_ticket_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_ticket_number ON public.support_tickets USING btree (ticket_number);


--
-- Name: idx_user_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);


--
-- Name: idx_visitor_sessions_first_seen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitor_sessions_first_seen ON public.visitor_sessions USING btree (first_seen);


--
-- Name: idx_visitor_sessions_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitor_sessions_session_id ON public.visitor_sessions USING btree (session_id);


--
-- Name: exhibitors check_exhibitor_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_exhibitor_update BEFORE UPDATE ON public.exhibitors FOR EACH ROW EXECUTE FUNCTION public.validate_exhibitor_update();


--
-- Name: speakers on_speaker_deleted; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_speaker_deleted AFTER DELETE ON public.speakers FOR EACH ROW EXECUTE FUNCTION public.delete_speaker_user();


--
-- Name: support_tickets trigger_set_ticket_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_ticket_number BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_ticket_number();


--
-- Name: agenda_sessions update_agenda_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agenda_sessions_updated_at BEFORE UPDATE ON public.agenda_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_posts update_blog_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_managers update_customer_managers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_managers_updated_at BEFORE UPDATE ON public.customer_managers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: draft_sessions update_draft_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_draft_sessions_updated_at BEFORE UPDATE ON public.draft_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: email_deadlines update_email_deadlines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_email_deadlines_updated_at BEFORE UPDATE ON public.email_deadlines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: email_templates update_email_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: exhibitor_advert_submissions update_exhibitor_advert_submissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_exhibitor_advert_submissions_updated_at BEFORE UPDATE ON public.exhibitor_advert_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: exhibitor_inquiries update_exhibitor_inquiries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_exhibitor_inquiries_updated_at BEFORE UPDATE ON public.exhibitor_inquiries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: exhibitor_speaker_submissions update_exhibitor_speaker_submissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_exhibitor_speaker_submissions_updated_at BEFORE UPDATE ON public.exhibitor_speaker_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: exhibitors update_exhibitors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_exhibitors_updated_at BEFORE UPDATE ON public.exhibitors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: footer_menu_items update_footer_menu_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_footer_menu_items_updated_at BEFORE UPDATE ON public.footer_menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: global_html_snippets update_global_html_snippets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_global_html_snippets_updated_at BEFORE UPDATE ON public.global_html_snippets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: marketing_tools update_marketing_tools_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_marketing_tools_updated_at BEFORE UPDATE ON public.marketing_tools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: media_library update_media_library_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_media_library_updated_at BEFORE UPDATE ON public.media_library FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: navbar_menu_items update_navbar_menu_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_navbar_menu_items_updated_at BEFORE UPDATE ON public.navbar_menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: page_content update_page_content_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_page_content_updated_at BEFORE UPDATE ON public.page_content FOR EACH ROW EXECUTE FUNCTION public.update_page_content_updated_at();


--
-- Name: page_section_order update_page_section_order_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_page_section_order_updated_at BEFORE UPDATE ON public.page_section_order FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: section_column_order update_section_column_order_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_section_column_order_updated_at BEFORE UPDATE ON public.section_column_order FOR EACH ROW EXECUTE FUNCTION public.update_section_column_order_updated_at();


--
-- Name: show_suppliers update_show_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_show_suppliers_updated_at BEFORE UPDATE ON public.show_suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: speaker_submissions update_speaker_submissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_speaker_submissions_updated_at BEFORE UPDATE ON public.speaker_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: speakers update_speakers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_speakers_updated_at BEFORE UPDATE ON public.speakers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_profiles update_user_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: visitor_sessions update_visitor_sessions_last_seen; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_visitor_sessions_last_seen BEFORE UPDATE ON public.visitor_sessions FOR EACH ROW EXECUTE FUNCTION public.update_visitor_last_seen();


--
-- Name: website_pages update_website_pages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_website_pages_updated_at BEFORE UPDATE ON public.website_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: website_styles update_website_styles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_website_styles_updated_at BEFORE UPDATE ON public.website_styles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: draft_sessions draft_sessions_published_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_sessions
    ADD CONSTRAINT draft_sessions_published_session_id_fkey FOREIGN KEY (published_session_id) REFERENCES public.agenda_sessions(id);


--
-- Name: draft_sessions draft_sessions_speaker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_sessions
    ADD CONSTRAINT draft_sessions_speaker_id_fkey FOREIGN KEY (speaker_id) REFERENCES public.speakers(id) ON DELETE CASCADE;


--
-- Name: exhibitor_address exhibitor_address_exhibitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_address
    ADD CONSTRAINT exhibitor_address_exhibitor_id_fkey FOREIGN KEY (exhibitor_id) REFERENCES public.exhibitors(id) ON DELETE CASCADE;


--
-- Name: exhibitor_advert_submissions exhibitor_advert_submissions_exhibitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_advert_submissions
    ADD CONSTRAINT exhibitor_advert_submissions_exhibitor_id_fkey FOREIGN KEY (exhibitor_id) REFERENCES public.exhibitors(id) ON DELETE CASCADE;


--
-- Name: exhibitor_contacts exhibitor_contacts_exhibitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_contacts
    ADD CONSTRAINT exhibitor_contacts_exhibitor_id_fkey FOREIGN KEY (exhibitor_id) REFERENCES public.exhibitors(id) ON DELETE CASCADE;


--
-- Name: exhibitor_inquiries exhibitor_inquiries_exhibitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_inquiries
    ADD CONSTRAINT exhibitor_inquiries_exhibitor_id_fkey FOREIGN KEY (exhibitor_id) REFERENCES public.exhibitors(id) ON DELETE CASCADE;


--
-- Name: exhibitor_products exhibitor_products_exhibitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_products
    ADD CONSTRAINT exhibitor_products_exhibitor_id_fkey FOREIGN KEY (exhibitor_id) REFERENCES public.exhibitors(id) ON DELETE CASCADE;


--
-- Name: exhibitor_social_media exhibitor_social_media_exhibitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_social_media
    ADD CONSTRAINT exhibitor_social_media_exhibitor_id_fkey FOREIGN KEY (exhibitor_id) REFERENCES public.exhibitors(id) ON DELETE CASCADE;


--
-- Name: exhibitor_speaker_headshots exhibitor_speaker_headshots_exhibitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_speaker_headshots
    ADD CONSTRAINT exhibitor_speaker_headshots_exhibitor_id_fkey FOREIGN KEY (exhibitor_id) REFERENCES public.exhibitors(id) ON DELETE CASCADE;


--
-- Name: exhibitor_speaker_submissions exhibitor_speaker_submissions_exhibitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitor_speaker_submissions
    ADD CONSTRAINT exhibitor_speaker_submissions_exhibitor_id_fkey FOREIGN KEY (exhibitor_id) REFERENCES public.exhibitors(id) ON DELETE CASCADE;


--
-- Name: exhibitors exhibitors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exhibitors
    ADD CONSTRAINT exhibitors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: footer_menu_items footer_menu_items_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.footer_menu_items
    ADD CONSTRAINT footer_menu_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.footer_menu_items(id) ON DELETE CASCADE;


--
-- Name: media_library media_library_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_library
    ADD CONSTRAINT media_library_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: navbar_menu_items navbar_menu_items_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.navbar_menu_items
    ADD CONSTRAINT navbar_menu_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.navbar_menu_items(id) ON DELETE CASCADE;


--
-- Name: portal_menu_items portal_menu_items_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_menu_items
    ADD CONSTRAINT portal_menu_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.portal_menu_items(id) ON DELETE CASCADE;


--
-- Name: session_speakers session_speakers_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_speakers
    ADD CONSTRAINT session_speakers_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.agenda_sessions(id) ON DELETE CASCADE;


--
-- Name: session_speakers session_speakers_speaker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_speakers
    ADD CONSTRAINT session_speakers_speaker_id_fkey FOREIGN KEY (speaker_id) REFERENCES public.speakers(id) ON DELETE CASCADE;


--
-- Name: speaker_submissions speaker_submissions_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaker_submissions
    ADD CONSTRAINT speaker_submissions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: speaker_submissions speaker_submissions_speaker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaker_submissions
    ADD CONSTRAINT speaker_submissions_speaker_id_fkey FOREIGN KEY (speaker_id) REFERENCES public.speakers(id) ON DELETE CASCADE;


--
-- Name: speakers speakers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speakers
    ADD CONSTRAINT speakers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: supplier_files supplier_files_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_files
    ADD CONSTRAINT supplier_files_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.show_suppliers(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_exhibitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_exhibitor_id_fkey FOREIGN KEY (exhibitor_id) REFERENCES public.exhibitors(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins and CS can assign roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can assign roles" ON public.user_roles FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitors Admins and CS can delete exhibitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can delete exhibitors" ON public.exhibitors FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: marketing_tools Admins and CS can delete marketing tools; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can delete marketing tools" ON public.marketing_tools FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: navbar_menu_items Admins and CS can delete navbar menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can delete navbar menu items" ON public.navbar_menu_items FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: page_content Admins and CS can delete page_content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can delete page_content" ON public.page_content FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: website_pages Admins and CS can delete pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can delete pages" ON public.website_pages FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: supplier_files Admins and CS can delete supplier files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can delete supplier files" ON public.supplier_files FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitors Admins and CS can insert exhibitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can insert exhibitors" ON public.exhibitors FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: marketing_tools Admins and CS can insert marketing tools; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can insert marketing tools" ON public.marketing_tools FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: navbar_menu_items Admins and CS can insert navbar menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can insert navbar menu items" ON public.navbar_menu_items FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: website_pages Admins and CS can insert pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can insert pages" ON public.website_pages FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: supplier_files Admins and CS can insert supplier files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can insert supplier files" ON public.supplier_files FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: customer_managers Admins and CS can manage customer managers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can manage customer managers" ON public.customer_managers USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: speaker_submissions Admins and CS can manage speaker submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can manage speaker submissions" ON public.speaker_submissions USING (public.is_admin_or_cs_or_pm(auth.uid())) WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: user_roles Admins and CS can remove roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can remove roles" ON public.user_roles FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitors Admins and CS can update exhibitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can update exhibitors" ON public.exhibitors FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: marketing_tools Admins and CS can update marketing tools; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can update marketing tools" ON public.marketing_tools FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: navbar_menu_items Admins and CS can update navbar menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can update navbar menu items" ON public.navbar_menu_items FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: page_content Admins and CS can update page_content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can update page_content" ON public.page_content FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: website_pages Admins and CS can update pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can update pages" ON public.website_pages FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: user_roles Admins and CS can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can update roles" ON public.user_roles FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: supplier_files Admins and CS can update supplier files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can update supplier files" ON public.supplier_files FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: navbar_menu_items Admins and CS can view all navbar menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can view all navbar menu items" ON public.navbar_menu_items FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: website_pages Admins and CS can view all pages including drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can view all pages including drafts" ON public.website_pages FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: user_roles Admins and CS can view all user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can view all user roles" ON public.user_roles FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: page_views Admins and CS can view page views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and CS can view page views" ON public.page_views FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_speaker_headshots Admins can delete speaker headshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete speaker headshots" ON public.exhibitor_speaker_headshots FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_speaker_headshots Admins can insert exhibitor speaker headshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert exhibitor speaker headshots" ON public.exhibitor_speaker_headshots FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_speaker_headshots Admins can view all speaker headshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all speaker headshots" ON public.exhibitor_speaker_headshots FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: support_tickets Admins, CS, and PM can create support tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can create support tickets" ON public.support_tickets FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_advert_submissions Admins, CS, and PM can delete advert submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can delete advert submissions" ON public.exhibitor_advert_submissions FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: footer_menu_items Admins, CS, and PM can delete footer menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can delete footer menu items" ON public.footer_menu_items FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: media_library Admins, CS, and PM can delete from media library; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can delete from media library" ON public.media_library FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: global_html_snippets Admins, CS, and PM can delete global HTML snippets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can delete global HTML snippets" ON public.global_html_snippets FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_inquiries Admins, CS, and PM can delete inquiries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can delete inquiries" ON public.exhibitor_inquiries FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: portal_menu_items Admins, CS, and PM can delete portal menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can delete portal menu items" ON public.portal_menu_items FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: registrations Admins, CS, and PM can delete registrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can delete registrations" ON public.registrations FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: section_column_order Admins, CS, and PM can delete section_column_order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can delete section_column_order" ON public.section_column_order FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: agenda_sessions Admins, CS, and PM can delete sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can delete sessions" ON public.agenda_sessions FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: show_suppliers Admins, CS, and PM can delete show suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can delete show suppliers" ON public.show_suppliers FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_speaker_submissions Admins, CS, and PM can delete speaker submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can delete speaker submissions" ON public.exhibitor_speaker_submissions FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: speakers Admins, CS, and PM can delete speakers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can delete speakers" ON public.speakers FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: website_styles Admins, CS, and PM can delete website styles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can delete website styles" ON public.website_styles FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_advert_submissions Admins, CS, and PM can insert exhibitor advert submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can insert exhibitor advert submissions" ON public.exhibitor_advert_submissions FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_speaker_submissions Admins, CS, and PM can insert exhibitor speaker submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can insert exhibitor speaker submissions" ON public.exhibitor_speaker_submissions FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: footer_menu_items Admins, CS, and PM can insert footer menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can insert footer menu items" ON public.footer_menu_items FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: global_html_snippets Admins, CS, and PM can insert global HTML snippets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can insert global HTML snippets" ON public.global_html_snippets FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: page_content Admins, CS, and PM can insert page_content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can insert page_content" ON public.page_content FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: portal_menu_items Admins, CS, and PM can insert portal menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can insert portal menu items" ON public.portal_menu_items FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: user_profiles Admins, CS, and PM can insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can insert profiles" ON public.user_profiles FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: section_column_order Admins, CS, and PM can insert section_column_order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can insert section_column_order" ON public.section_column_order FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: agenda_sessions Admins, CS, and PM can insert sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can insert sessions" ON public.agenda_sessions FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: show_suppliers Admins, CS, and PM can insert show suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can insert show suppliers" ON public.show_suppliers FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: speakers Admins, CS, and PM can insert speakers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can insert speakers" ON public.speakers FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: website_styles Admins, CS, and PM can insert website styles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can insert website styles" ON public.website_styles FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_address Admins, CS, and PM can manage all addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can manage all addresses" ON public.exhibitor_address USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_contacts Admins, CS, and PM can manage all contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can manage all contacts" ON public.exhibitor_contacts USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: draft_sessions Admins, CS, and PM can manage all draft sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can manage all draft sessions" ON public.draft_sessions USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_products Admins, CS, and PM can manage all products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can manage all products" ON public.exhibitor_products USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_social_media Admins, CS, and PM can manage all social media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can manage all social media" ON public.exhibitor_social_media USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: blog_posts Admins, CS, and PM can manage blog posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can manage blog posts" ON public.blog_posts USING (public.is_admin_or_cs_or_pm(auth.uid())) WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: email_deadlines Admins, CS, and PM can manage deadlines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can manage deadlines" ON public.email_deadlines USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: email_templates Admins, CS, and PM can manage email templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can manage email templates" ON public.email_templates USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: event_settings Admins, CS, and PM can manage event settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can manage event settings" ON public.event_settings USING (public.is_admin_or_cs_or_pm(auth.uid())) WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: session_speakers Admins, CS, and PM can manage session speakers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can manage session speakers" ON public.session_speakers USING (public.is_admin_or_cs_or_pm(auth.uid())) WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_inquiries Admins, CS, and PM can update all inquiries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can update all inquiries" ON public.exhibitor_inquiries FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: user_profiles Admins, CS, and PM can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can update all profiles" ON public.user_profiles FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: footer_menu_items Admins, CS, and PM can update footer menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can update footer menu items" ON public.footer_menu_items FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: global_html_snippets Admins, CS, and PM can update global HTML snippets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can update global HTML snippets" ON public.global_html_snippets FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: media_library Admins, CS, and PM can update media library; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can update media library" ON public.media_library FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: portal_menu_items Admins, CS, and PM can update portal menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can update portal menu items" ON public.portal_menu_items FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: registrations Admins, CS, and PM can update registrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can update registrations" ON public.registrations FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: section_column_order Admins, CS, and PM can update section_column_order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can update section_column_order" ON public.section_column_order FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: agenda_sessions Admins, CS, and PM can update sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can update sessions" ON public.agenda_sessions FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: show_suppliers Admins, CS, and PM can update show suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can update show suppliers" ON public.show_suppliers FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: speakers Admins, CS, and PM can update speakers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can update speakers" ON public.speakers FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: support_tickets Admins, CS, and PM can update tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can update tickets" ON public.support_tickets FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: website_styles Admins, CS, and PM can update website styles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can update website styles" ON public.website_styles FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_advert_submissions Admins, CS, and PM can view all advert submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can view all advert submissions" ON public.exhibitor_advert_submissions FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: event_settings Admins, CS, and PM can view all event settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can view all event settings" ON public.event_settings FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: footer_menu_items Admins, CS, and PM can view all footer menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can view all footer menu items" ON public.footer_menu_items FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_inquiries Admins, CS, and PM can view all inquiries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can view all inquiries" ON public.exhibitor_inquiries FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: portal_menu_items Admins, CS, and PM can view all portal menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can view all portal menu items" ON public.portal_menu_items FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: user_profiles Admins, CS, and PM can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can view all profiles" ON public.user_profiles FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_speaker_submissions Admins, CS, and PM can view all speaker submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can view all speaker submissions" ON public.exhibitor_speaker_submissions FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: show_suppliers Admins, CS, and PM can view all supplier details; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can view all supplier details" ON public.show_suppliers FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: support_tickets Admins, CS, and PM can view all tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can view all tickets" ON public.support_tickets FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: registrations Admins, CS, and PM can view registrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can view registrations" ON public.registrations FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: visitor_sessions Admins, CS, and PM can view visitor sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can view visitor sessions" ON public.visitor_sessions FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: website_styles Admins, CS, and PM can view website styles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins, CS, and PM can view website styles" ON public.website_styles FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: page_content Allow public read access to page_content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to page_content" ON public.page_content FOR SELECT USING (true);


--
-- Name: section_column_order Allow public read access to section_column_order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to section_column_order" ON public.section_column_order FOR SELECT USING (true);


--
-- Name: registrations Allow public registration insertions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public registration insertions" ON public.registrations FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: page_views Anyone can insert page views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert page views" ON public.page_views FOR INSERT WITH CHECK (true);


--
-- Name: visitor_sessions Anyone can insert visitor sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert visitor sessions" ON public.visitor_sessions FOR INSERT WITH CHECK (true);


--
-- Name: registrations Anyone can register; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can register" ON public.registrations FOR INSERT WITH CHECK (true);


--
-- Name: exhibitor_inquiries Anyone can submit inquiries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit inquiries" ON public.exhibitor_inquiries FOR INSERT WITH CHECK (true);


--
-- Name: visitor_sessions Anyone can update their own session; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update their own session" ON public.visitor_sessions FOR UPDATE USING (true);


--
-- Name: email_deadlines Anyone can view active deadlines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active deadlines" ON public.email_deadlines FOR SELECT USING ((is_active = true));


--
-- Name: footer_menu_items Anyone can view active footer menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active footer menu items" ON public.footer_menu_items FOR SELECT USING ((is_active = true));


--
-- Name: customer_managers Anyone can view active managers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active managers" ON public.customer_managers FOR SELECT USING ((is_active = true));


--
-- Name: navbar_menu_items Anyone can view active navbar menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active navbar menu items" ON public.navbar_menu_items FOR SELECT USING ((is_active = true));


--
-- Name: website_styles Anyone can view active styles for display; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active styles for display" ON public.website_styles FOR SELECT USING (true);


--
-- Name: email_templates Anyone can view active templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active templates" ON public.email_templates FOR SELECT USING ((is_active = true));


--
-- Name: exhibitor_contacts Anyone can view approved active contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view approved active contacts" ON public.exhibitor_contacts FOR SELECT USING ((((is_active = true) AND ((approval_status = 'approved'::text) OR (approval_status IS NULL))) OR public.is_admin_or_cs_or_pm(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.exhibitors
  WHERE ((exhibitors.id = exhibitor_contacts.exhibitor_id) AND (exhibitors.user_id = auth.uid()))))));


--
-- Name: exhibitors Anyone can view approved active exhibitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view approved active exhibitors" ON public.exhibitors FOR SELECT USING ((((is_active = true) AND ((approval_status = 'approved'::text) OR (approval_status IS NULL))) OR public.is_admin_or_cs_or_pm(auth.uid()) OR (auth.uid() = user_id)));


--
-- Name: exhibitor_address Anyone can view approved addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view approved addresses" ON public.exhibitor_address FOR SELECT USING (((approval_status = 'approved'::text) OR (approval_status IS NULL) OR public.is_admin_or_cs_or_pm(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.exhibitors
  WHERE ((exhibitors.id = exhibitor_address.exhibitor_id) AND (exhibitors.user_id = auth.uid()))))));


--
-- Name: exhibitor_products Anyone can view approved products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view approved products" ON public.exhibitor_products FOR SELECT USING (((approval_status = 'approved'::text) OR (approval_status IS NULL) OR public.is_admin_or_cs_or_pm(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.exhibitors
  WHERE ((exhibitors.id = exhibitor_products.exhibitor_id) AND (exhibitors.user_id = auth.uid()))))));


--
-- Name: exhibitor_social_media Anyone can view approved social media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view approved social media" ON public.exhibitor_social_media FOR SELECT USING (((approval_status = 'approved'::text) OR (approval_status IS NULL) OR public.is_admin_or_cs_or_pm(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.exhibitors
  WHERE ((exhibitors.id = exhibitor_social_media.exhibitor_id) AND (exhibitors.user_id = auth.uid()))))));


--
-- Name: user_profiles Anyone can view customer service profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view customer service profiles" ON public.user_profiles FOR SELECT TO authenticated USING ((user_id IN ( SELECT user_roles.user_id
   FROM public.user_roles
  WHERE (user_roles.role = 'customer_service'::public.app_role))));


--
-- Name: event_settings Anyone can view event settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view event settings" ON public.event_settings FOR SELECT USING (true);


--
-- Name: gallery_photos Anyone can view gallery photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view gallery photos" ON public.gallery_photos FOR SELECT USING (true);


--
-- Name: global_html_snippets Anyone can view global HTML snippets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view global HTML snippets" ON public.global_html_snippets FOR SELECT TO anon USING (true);


--
-- Name: marketing_tools Anyone can view marketing tools; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view marketing tools" ON public.marketing_tools FOR SELECT TO anon USING (true);


--
-- Name: media_library Anyone can view media library; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view media library" ON public.media_library FOR SELECT USING (true);


--
-- Name: blog_posts Anyone can view published blog posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view published blog posts" ON public.blog_posts FOR SELECT USING (((status = 'published'::text) OR public.is_admin_or_cs_or_pm(auth.uid())));


--
-- Name: website_pages Anyone can view published pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view published pages" ON public.website_pages FOR SELECT USING ((status = 'published'::public.page_status));


--
-- Name: page_section_order Anyone can view section orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view section orders" ON public.page_section_order FOR SELECT USING (true);


--
-- Name: session_speakers Anyone can view session speakers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view session speakers" ON public.session_speakers FOR SELECT USING (true);


--
-- Name: agenda_sessions Anyone can view sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view sessions" ON public.agenda_sessions FOR SELECT USING (true);


--
-- Name: speakers Anyone can view speakers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view speakers" ON public.speakers FOR SELECT USING (true);


--
-- Name: supplier_files Anyone can view supplier files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view supplier files" ON public.supplier_files FOR SELECT USING (true);


--
-- Name: show_suppliers Anyone can view suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view suppliers" ON public.show_suppliers FOR SELECT TO anon USING (true);


--
-- Name: website_styles Anyone can view website styles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view website styles" ON public.website_styles FOR SELECT USING (true);


--
-- Name: gallery_photos Authenticated users can delete gallery photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete gallery photos" ON public.gallery_photos FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: gallery_photos Authenticated users can insert gallery photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert gallery photos" ON public.gallery_photos FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: page_section_order Authenticated users can manage section orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage section orders" ON public.page_section_order USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: gallery_photos Authenticated users can update gallery photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update gallery photos" ON public.gallery_photos FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: media_library Authenticated users can upload to media library; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can upload to media library" ON public.media_library FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: user_profiles Authenticated users can view CS profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view CS profiles" ON public.user_profiles FOR SELECT USING (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = user_profiles.user_id) AND (user_roles.role = 'customer_service'::public.app_role))))));


--
-- Name: portal_menu_items Authenticated users can view active portal menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active portal menu items" ON public.portal_menu_items FOR SELECT USING (((is_active = true) AND (auth.uid() IS NOT NULL)));


--
-- Name: user_roles Authenticated users can view customer service roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view customer service roles" ON public.user_roles FOR SELECT TO authenticated USING ((role = 'customer_service'::public.app_role));


--
-- Name: global_html_snippets Authenticated users can view global HTML snippets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view global HTML snippets" ON public.global_html_snippets FOR SELECT TO authenticated USING (true);


--
-- Name: marketing_tools Authenticated users can view marketing tools; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view marketing tools" ON public.marketing_tools FOR SELECT TO authenticated USING (true);


--
-- Name: user_profiles Authenticated users can view project manager profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view project manager profiles" ON public.user_profiles FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = user_profiles.user_id) AND (user_roles.role = 'project_manager'::public.app_role)))));


--
-- Name: user_roles Authenticated users can view project manager roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view project manager roles" ON public.user_roles FOR SELECT TO authenticated USING ((role = 'project_manager'::public.app_role));


--
-- Name: show_suppliers Authenticated users can view suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view suppliers" ON public.show_suppliers FOR SELECT TO authenticated USING (true);


--
-- Name: support_tickets Exhibitors can create tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exhibitors can create tickets" ON public.support_tickets FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.exhibitors
  WHERE ((exhibitors.id = support_tickets.exhibitor_id) AND (exhibitors.user_id = auth.uid())))));


--
-- Name: exhibitor_advert_submissions Exhibitors can insert their own advert submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exhibitors can insert their own advert submissions" ON public.exhibitor_advert_submissions FOR INSERT TO authenticated WITH CHECK ((exhibitor_id IN ( SELECT exhibitors.id
   FROM public.exhibitors
  WHERE (exhibitors.user_id = auth.uid()))));


--
-- Name: exhibitor_speaker_headshots Exhibitors can insert their own speaker headshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exhibitors can insert their own speaker headshots" ON public.exhibitor_speaker_headshots FOR INSERT WITH CHECK ((exhibitor_id IN ( SELECT exhibitors.id
   FROM public.exhibitors
  WHERE (exhibitors.user_id = auth.uid()))));


--
-- Name: exhibitor_speaker_submissions Exhibitors can insert their own speaker submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exhibitors can insert their own speaker submissions" ON public.exhibitor_speaker_submissions FOR INSERT TO authenticated WITH CHECK ((exhibitor_id IN ( SELECT exhibitors.id
   FROM public.exhibitors
  WHERE (exhibitors.user_id = auth.uid()))));


--
-- Name: exhibitor_address Exhibitors can submit address changes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exhibitors can submit address changes" ON public.exhibitor_address TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.exhibitors
  WHERE ((exhibitors.id = exhibitor_address.exhibitor_id) AND (exhibitors.user_id = auth.uid())))));


--
-- Name: exhibitors Exhibitors can submit changes for approval; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exhibitors can submit changes for approval" ON public.exhibitors FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: exhibitor_contacts Exhibitors can submit contact changes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exhibitors can submit contact changes" ON public.exhibitor_contacts TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.exhibitors
  WHERE ((exhibitors.id = exhibitor_contacts.exhibitor_id) AND (exhibitors.user_id = auth.uid())))));


--
-- Name: exhibitor_products Exhibitors can submit product changes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exhibitors can submit product changes" ON public.exhibitor_products TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.exhibitors
  WHERE ((exhibitors.id = exhibitor_products.exhibitor_id) AND (exhibitors.user_id = auth.uid())))));


--
-- Name: exhibitor_social_media Exhibitors can submit social media changes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exhibitors can submit social media changes" ON public.exhibitor_social_media TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.exhibitors
  WHERE ((exhibitors.id = exhibitor_social_media.exhibitor_id) AND (exhibitors.user_id = auth.uid())))));


--
-- Name: exhibitor_inquiries Exhibitors can update their own inquiry status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exhibitors can update their own inquiry status" ON public.exhibitor_inquiries FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.exhibitors
  WHERE ((exhibitors.id = exhibitor_inquiries.exhibitor_id) AND (exhibitors.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.exhibitors
  WHERE ((exhibitors.id = exhibitor_inquiries.exhibitor_id) AND (exhibitors.user_id = auth.uid())))));


--
-- Name: exhibitors Exhibitors can update their own listing (except status); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exhibitors can update their own listing (except status)" ON public.exhibitors FOR UPDATE USING (((auth.uid() = user_id) AND (NOT public.is_admin_or_cs_or_pm(auth.uid())))) WITH CHECK (((auth.uid() = user_id) AND (NOT public.is_admin_or_cs_or_pm(auth.uid())) AND (is_active = ( SELECT exhibitors_1.is_active
   FROM public.exhibitors exhibitors_1
  WHERE (exhibitors_1.id = exhibitors_1.id)))));


--
-- Name: exhibitor_advert_submissions Exhibitors can view their own advert submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exhibitors can view their own advert submissions" ON public.exhibitor_advert_submissions FOR SELECT TO authenticated USING ((exhibitor_id IN ( SELECT exhibitors.id
   FROM public.exhibitors
  WHERE (exhibitors.user_id = auth.uid()))));


--
-- Name: exhibitor_inquiries Exhibitors can view their own inquiries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exhibitors can view their own inquiries" ON public.exhibitor_inquiries FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.exhibitors
  WHERE ((exhibitors.id = exhibitor_inquiries.exhibitor_id) AND (exhibitors.user_id = auth.uid())))));


--
-- Name: exhibitor_speaker_headshots Exhibitors can view their own speaker headshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exhibitors can view their own speaker headshots" ON public.exhibitor_speaker_headshots FOR SELECT USING ((exhibitor_id IN ( SELECT exhibitors.id
   FROM public.exhibitors
  WHERE (exhibitors.user_id = auth.uid()))));


--
-- Name: exhibitor_speaker_submissions Exhibitors can view their own speaker submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exhibitors can view their own speaker submissions" ON public.exhibitor_speaker_submissions FOR SELECT TO authenticated USING ((exhibitor_id IN ( SELECT exhibitors.id
   FROM public.exhibitors
  WHERE (exhibitors.user_id = auth.uid()))));


--
-- Name: support_tickets Exhibitors can view their own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exhibitors can view their own tickets" ON public.support_tickets FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.exhibitors
  WHERE ((exhibitors.id = support_tickets.exhibitor_id) AND (exhibitors.user_id = auth.uid())))));


--
-- Name: speaker_submissions Speakers can insert their own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Speakers can insert their own submissions" ON public.speaker_submissions FOR INSERT WITH CHECK ((speaker_id IN ( SELECT speakers.id
   FROM public.speakers
  WHERE (speakers.user_id = auth.uid()))));


--
-- Name: draft_sessions Speakers can update their own draft sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Speakers can update their own draft sessions" ON public.draft_sessions FOR UPDATE USING ((speaker_id IN ( SELECT speakers.id
   FROM public.speakers
  WHERE (speakers.user_id = auth.uid()))));


--
-- Name: speakers Speakers can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Speakers can update their own profile" ON public.speakers FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: draft_sessions Speakers can view their own draft sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Speakers can view their own draft sessions" ON public.draft_sessions FOR SELECT USING ((speaker_id IN ( SELECT speakers.id
   FROM public.speakers
  WHERE (speakers.user_id = auth.uid()))));


--
-- Name: speaker_submissions Speakers can view their own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Speakers can view their own submissions" ON public.speaker_submissions FOR SELECT USING ((speaker_id IN ( SELECT speakers.id
   FROM public.speakers
  WHERE (speakers.user_id = auth.uid()))));


--
-- Name: draft_sessions System can insert draft sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert draft sessions" ON public.draft_sessions FOR INSERT WITH CHECK (true);


--
-- Name: user_profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: exhibitor_advert_submissions admin_cs_pm_update_exhibitor_advert_submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_cs_pm_update_exhibitor_advert_submissions ON public.exhibitor_advert_submissions FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_speaker_submissions admin_cs_pm_update_exhibitor_speaker_submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_cs_pm_update_exhibitor_speaker_submissions ON public.exhibitor_speaker_submissions FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: exhibitor_speaker_headshots admin_update_exhibitor_speaker_headshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_update_exhibitor_speaker_headshots ON public.exhibitor_speaker_headshots FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));


--
-- Name: agenda_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agenda_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_managers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_managers ENABLE ROW LEVEL SECURITY;

--
-- Name: draft_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.draft_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: email_deadlines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_deadlines ENABLE ROW LEVEL SECURITY;

--
-- Name: email_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: event_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: exhibitor_address; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exhibitor_address ENABLE ROW LEVEL SECURITY;

--
-- Name: exhibitor_advert_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exhibitor_advert_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: exhibitor_contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exhibitor_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: exhibitor_inquiries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exhibitor_inquiries ENABLE ROW LEVEL SECURITY;

--
-- Name: exhibitor_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exhibitor_products ENABLE ROW LEVEL SECURITY;

--
-- Name: exhibitor_social_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exhibitor_social_media ENABLE ROW LEVEL SECURITY;

--
-- Name: exhibitor_speaker_headshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exhibitor_speaker_headshots ENABLE ROW LEVEL SECURITY;

--
-- Name: exhibitor_speaker_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exhibitor_speaker_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: exhibitors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exhibitors ENABLE ROW LEVEL SECURITY;

--
-- Name: footer_menu_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.footer_menu_items ENABLE ROW LEVEL SECURITY;

--
-- Name: gallery_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: global_html_snippets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.global_html_snippets ENABLE ROW LEVEL SECURITY;

--
-- Name: marketing_tools; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketing_tools ENABLE ROW LEVEL SECURITY;

--
-- Name: media_library; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

--
-- Name: navbar_menu_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.navbar_menu_items ENABLE ROW LEVEL SECURITY;

--
-- Name: page_content; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;

--
-- Name: page_section_order; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.page_section_order ENABLE ROW LEVEL SECURITY;

--
-- Name: page_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

--
-- Name: portal_menu_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portal_menu_items ENABLE ROW LEVEL SECURITY;

--
-- Name: registrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: section_column_order; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.section_column_order ENABLE ROW LEVEL SECURITY;

--
-- Name: session_speakers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_speakers ENABLE ROW LEVEL SECURITY;

--
-- Name: show_suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.show_suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: speaker_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.speaker_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: speakers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_files ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: visitor_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: website_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: website_styles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.website_styles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;