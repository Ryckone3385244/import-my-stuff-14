
-- =============================================
-- PART 1: Fix app_role enum - add missing values
-- =============================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'exhibitor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'speaker';
