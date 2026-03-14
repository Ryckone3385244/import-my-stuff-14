-- Add INSERT policy for blog_images bucket to allow authenticated users (admin/cs/pm) to upload
CREATE POLICY "Admins and CS can upload blog images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'blog_images' 
  AND is_admin_or_cs_or_pm(auth.uid())
);

-- Add UPDATE policy for blog_images bucket
CREATE POLICY "Admins and CS can update blog images"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'blog_images' 
  AND is_admin_or_cs_or_pm(auth.uid())
);

-- Add DELETE policy for blog_images bucket
CREATE POLICY "Admins and CS can delete blog images"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'blog_images' 
  AND is_admin_or_cs_or_pm(auth.uid())
);

-- Add SELECT policy for blog_images bucket (public read)
CREATE POLICY "Anyone can view blog images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'blog_images');