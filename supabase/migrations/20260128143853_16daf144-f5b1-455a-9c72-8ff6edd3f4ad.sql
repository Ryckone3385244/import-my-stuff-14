-- Add mobile hero title size column
ALTER TABLE public.website_styles 
ADD COLUMN IF NOT EXISTS hero_title_size_mobile text DEFAULT '2rem';