-- First remove foreign key constraints from objects table
ALTER TABLE storage.objects
DROP CONSTRAINT IF EXISTS objects_bucketid_fkey;

-- Then recreate it with ON DELETE CASCADE
ALTER TABLE storage.objects
ADD CONSTRAINT objects_bucketid_fkey
FOREIGN KEY (bucket_id)
REFERENCES storage.buckets(id)
ON DELETE CASCADE;

-- Make cover_url nullable
ALTER TABLE sounds 
ALTER COLUMN cover_url DROP NOT NULL;

-- Update existing records to have NULL cover_url
UPDATE sounds 
SET cover_url = NULL;

-- Remove images bucket and its contents
DELETE FROM storage.objects
WHERE bucket_id = 'images';

DELETE FROM storage.buckets
WHERE id = 'images';

-- Update audio storage policies
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

-- Update bucket configuration
UPDATE storage.buckets
SET public = true,
    file_size_limit = 104857600, -- 100MB
    allowed_mime_types = NULL -- Allow all audio MIME types
WHERE id = 'audio';