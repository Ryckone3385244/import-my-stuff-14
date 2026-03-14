-- Add transparent card colors to website_styles table
ALTER TABLE public.website_styles 
ADD COLUMN IF NOT EXISTS transparent_card_text_color text,
ADD COLUMN IF NOT EXISTS transparent_card_title_color text;