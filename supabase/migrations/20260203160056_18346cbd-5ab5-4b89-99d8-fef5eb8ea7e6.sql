-- Add renderer column to website_pages table for template-based rendering
ALTER TABLE public.website_pages 
ADD COLUMN IF NOT EXISTS renderer TEXT DEFAULT 'dynamic';

-- Add is_active column to seo_redirects if it doesn't exist
ALTER TABLE public.seo_redirects 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for faster redirect lookups
CREATE INDEX IF NOT EXISTS idx_seo_redirects_from_path_active 
ON public.seo_redirects (from_path, is_active) 
WHERE is_active = true;

-- Create index for faster page lookups by URL and status
CREATE INDEX IF NOT EXISTS idx_website_pages_url_status 
ON public.website_pages (page_url, status, is_active) 
WHERE is_active = true AND status = 'published';