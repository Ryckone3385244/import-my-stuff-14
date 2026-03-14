-- Create table for SEO redirects (enables auto-update when pages are renamed)
CREATE TABLE public.seo_redirects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_path TEXT NOT NULL UNIQUE,
  to_path TEXT NOT NULL,
  redirect_type TEXT NOT NULL DEFAULT '301',
  is_pattern BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seo_redirects ENABLE ROW LEVEL SECURITY;

-- Public can read redirects (needed for client-side redirect handling)
CREATE POLICY "Anyone can read redirects"
  ON public.seo_redirects
  FOR SELECT
  USING (true);

-- Only admins can manage redirects
CREATE POLICY "Admins can manage redirects"
  ON public.seo_redirects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'customer_service', 'project_manager')
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_seo_redirects_updated_at
  BEFORE UPDATE ON public.seo_redirects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed existing redirects from the hardcoded list
INSERT INTO public.seo_redirects (from_path, to_path, is_pattern) VALUES
  ('/attend', '/registration', false),
  ('/register-interest-attend', '/registration', false),
  ('/speaker-list', '/speakers', false),
  ('/speaker', '/speakers', false),
  ('/exhibitor-list', '/exhibitors', false),
  ('/exhibitor', '/exhibitors', false),
  ('/exhibitor-e-zone-login', '/exhibitor-portal/login', false),
  ('/e-zone-landing-page', '/exhibitor-portal', false),
  ('/e-zone', '/exhibitor-portal', false),
  ('/ezone', '/exhibitor-portal', false),
  ('/awards-customer-connect-expo', '/about-us', false),
  ('/cx-podcast', '/news', false),
  ('/xperience-ai', '/about-us', false),
  ('/advisory-board', '/about-us', false),
  ('/contact-team-hutj', '/contact', false),
  ('/contact-team', '/contact', false),
  ('/contact-us', '/contact', false),
  ('/floor-plan', '/floorplan', false),
  ('/floorplans', '/floorplan', false),
  ('/floor-plans', '/floorplan', false),
  ('/register', '/registration', false),
  ('/book-stand', '/exhibit', false),
  ('/book-a-stand', '/exhibit', false),
  ('/sponsor', '/become-a-sponsor', false),
  ('/sponsorship', '/become-a-sponsor', false),
  ('/press', '/press-opportunities', false),
  ('/media', '/media-partners', false),
  ('/gallery', '/photo-gallery', false),
  ('/photos', '/photo-gallery', false),
  ('/travel', '/travel-accommodation', false),
  ('/hotels', '/travel-accommodation', false),
  ('/accommodation', '/travel-accommodation', false),
  ('/schedule', '/agenda', false),
  ('/programme', '/agenda', false),
  ('/program', '/agenda', false),
  ('/timetable', '/agenda', false),
  ('/privacy', '/privacy-policy', false),
  ('/terms', '/terms-conditions', false),
  ('/cookies', '/cookie-policy', false),
  ('/blog', '/news', false),
  ('/blogs', '/news', false),
  ('/articles', '/news', false)
ON CONFLICT (from_path) DO NOTHING;

-- Add pattern redirects
INSERT INTO public.seo_redirects (from_path, to_path, is_pattern) VALUES
  ('/speaker/', '/speakers/', true),
  ('/exhibitor/', '/exhibitors/', true),
  ('/blog/', '/news/', true),
  ('/articles/', '/news/', true)
ON CONFLICT (from_path) DO NOTHING;