
-- Phase 5: Element styles table for per-viewport styling
CREATE TABLE public.element_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_name TEXT NOT NULL,
  element_id TEXT NOT NULL,
  viewport TEXT NOT NULL DEFAULT 'desktop',
  styles JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_name, element_id, viewport)
);

-- Enable RLS
ALTER TABLE public.element_styles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view element styles"
  ON public.element_styles FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage element styles"
  ON public.element_styles FOR ALL
  TO authenticated
  USING (is_admin_or_cs_or_pm(auth.uid()))
  WITH CHECK (is_admin_or_cs_or_pm(auth.uid()));

-- Phase 3: Add column_width to section_column_order
ALTER TABLE public.section_column_order ADD COLUMN IF NOT EXISTS column_width TEXT DEFAULT NULL;

-- Phase 6: Motion effects storage
CREATE TABLE public.element_motion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_name TEXT NOT NULL,
  element_id TEXT NOT NULL,
  effect_type TEXT NOT NULL DEFAULT 'none',
  effect_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_name, element_id)
);

ALTER TABLE public.element_motion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view element motion"
  ON public.element_motion FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage element motion"
  ON public.element_motion FOR ALL
  TO authenticated
  USING (is_admin_or_cs_or_pm(auth.uid()))
  WITH CHECK (is_admin_or_cs_or_pm(auth.uid()));

-- Updated_at triggers
CREATE TRIGGER update_element_styles_updated_at
  BEFORE UPDATE ON public.element_styles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_element_motion_updated_at
  BEFORE UPDATE ON public.element_motion
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
