
-- Phase 1: Layout Partials system
-- A "partial" is a reusable layout fragment (navbar or footer) that can be
-- edited via the builder and assigned per-page or as a global default.

-- 1. Create the layout_partials table
CREATE TABLE public.layout_partials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partial_type TEXT NOT NULL CHECK (partial_type IN ('navbar', 'footer')),
  name TEXT NOT NULL,
  description TEXT,
  is_template BOOLEAN NOT NULL DEFAULT false,
  template_key TEXT, -- e.g. 'navbar-centered', 'footer-minimal'
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add per-page override columns to website_pages
ALTER TABLE public.website_pages
  ADD COLUMN IF NOT EXISTS navbar_partial_id UUID REFERENCES public.layout_partials(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS footer_partial_id UUID REFERENCES public.layout_partials(id) ON DELETE SET NULL;

-- 3. RLS
ALTER TABLE public.layout_partials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view layout partials"
  ON public.layout_partials FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins, CS, and PM can manage layout partials"
  ON public.layout_partials FOR ALL
  TO public
  USING (is_admin_or_cs_or_pm(auth.uid()))
  WITH CHECK (is_admin_or_cs_or_pm(auth.uid()));

-- 4. Seed default partials and templates
-- Default navbar (the current hardcoded one)
INSERT INTO public.layout_partials (id, partial_type, name, description, is_template, template_key, is_default)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'navbar', 'Default Navbar', 'Standard event navbar with logo, menu items, and CTA buttons', false, 'navbar-standard', true),
  ('00000000-0000-0000-0000-000000000002', 'footer', 'Default Footer', 'Standard 4-column footer with venue, contact, links, and social', false, 'footer-standard', true);

-- Navbar templates
INSERT INTO public.layout_partials (partial_type, name, description, is_template, template_key)
VALUES
  ('navbar', 'Centered Logo', 'Logo centered above navigation links', true, 'navbar-centered'),
  ('navbar', 'Minimal', 'Clean minimal navbar with logo left and links right', true, 'navbar-minimal'),
  ('navbar', 'Mega Menu', 'Full-width dropdown menus with rich content', true, 'navbar-mega');

-- Footer templates
INSERT INTO public.layout_partials (partial_type, name, description, is_template, template_key)
VALUES
  ('footer', 'Minimal', 'Simple one-line footer with copyright and links', true, 'footer-minimal'),
  ('footer', 'Two Column', 'Two-column layout with info and links', true, 'footer-two-column'),
  ('footer', 'Fat Footer', 'Large multi-section footer with newsletter signup', true, 'footer-fat');
