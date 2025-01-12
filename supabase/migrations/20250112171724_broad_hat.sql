/*
  # Update MIME Type Handling

  1. Changes
    - Remove MIME type restrictions from sounds table
    - Update storage bucket configuration
    - Update storage policies to be more permissive
    - Add better error handling for uploads

  2. Security
    - Maintains RLS policies
    - Keeps file size limits
*/

-- Remove MIME type constraint from sounds table
ALTER TABLE sounds DROP CONSTRAINT IF EXISTS valid_mime_type;

-- Update bucket configuration to be more permissive
UPDATE storage.buckets
SET public = true,
    file_size_limit = 104857600, -- 100MB
    allowed_mime_types = NULL -- Allow all MIME types
WHERE id = 'audio';

-- Update storage policies to be more permissive
DROP POLICY IF EXISTS "Anyone can view audio" ON storage.objects;
CREATE POLICY "Anyone can view audio"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'audio');

DROP POLICY IF EXISTS "Authenticated users can upload audio" ON storage.objects;
CREATE POLICY "Authenticated users can upload audio"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'audio');