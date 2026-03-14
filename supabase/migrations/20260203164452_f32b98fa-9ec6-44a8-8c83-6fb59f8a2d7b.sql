-- Create page_versions table for version snapshots
CREATE TABLE IF NOT EXISTS page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_name TEXT NOT NULL,
  version_number INTEGER DEFAULT 1,
  content_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  section_order_snapshot JSONB DEFAULT '[]'::jsonb,
  column_order_snapshot JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_page_versions_page ON page_versions(page_name, created_at DESC);
CREATE INDEX idx_page_versions_page_version ON page_versions(page_name, version_number DESC);

-- Enable RLS
ALTER TABLE page_versions ENABLE ROW LEVEL SECURITY;

-- Allow admins to create versions
CREATE POLICY "Admins can create page versions"
  ON page_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'customer_service', 'project_manager')
    )
  );

-- Allow admins to view versions
CREATE POLICY "Admins can view page versions"
  ON page_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'customer_service', 'project_manager')
    )
  );

-- Allow admins to delete old versions (for cleanup)
CREATE POLICY "Admins can delete page versions"
  ON page_versions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'customer_service', 'project_manager')
    )
  );