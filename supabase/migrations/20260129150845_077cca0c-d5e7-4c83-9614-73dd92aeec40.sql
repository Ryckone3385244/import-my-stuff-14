-- Add meta title and description columns to exhibitors table
ALTER TABLE public.exhibitors 
ADD COLUMN IF NOT EXISTS meta_title text,
ADD COLUMN IF NOT EXISTS meta_description text;