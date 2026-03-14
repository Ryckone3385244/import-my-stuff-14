-- Add open_in_new_tab column to navbar_menu_items
ALTER TABLE public.navbar_menu_items
ADD COLUMN open_in_new_tab boolean NOT NULL DEFAULT false;

-- Add open_in_new_tab column to footer_menu_items
ALTER TABLE public.footer_menu_items
ADD COLUMN open_in_new_tab boolean NOT NULL DEFAULT false;

-- Add open_in_new_tab column to portal_menu_items
ALTER TABLE public.portal_menu_items
ADD COLUMN open_in_new_tab boolean NOT NULL DEFAULT false;