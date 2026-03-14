-- Add button text color fields
ALTER TABLE public.website_styles
ADD COLUMN IF NOT EXISTS button_text_color text DEFAULT '0 0% 100%',
ADD COLUMN IF NOT EXISTS button_2_text_color text DEFAULT '0 0% 100%';

-- Add title case setting for headings
ALTER TABLE public.website_styles
ADD COLUMN IF NOT EXISTS heading_text_transform text DEFAULT 'uppercase';

-- Add specific header sizes for hero titles and navbar menu items
ALTER TABLE public.website_styles
ADD COLUMN IF NOT EXISTS hero_title_size text DEFAULT '3.5rem',
ADD COLUMN IF NOT EXISTS navbar_menu_size text DEFAULT '0.875rem';