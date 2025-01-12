-- Remove all MIME type restrictions from audio bucket to allow proper MIME type handling
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'audio';

-- Create a function to handle file uploads with proper MIME type
CREATE OR REPLACE FUNCTION handle_storage_mime_type()
RETURNS trigger AS $$
BEGIN
  -- Force the MIME type for WAV files
  IF lower(right(NEW.name, 4)) = '.wav' THEN
    NEW.metadata = jsonb_set(
      COALESCE(NEW.metadata, '{}'::jsonb),
      '{mimetype}',
      '"audio/x-wav"'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to handle MIME types before insert
DROP TRIGGER IF EXISTS handle_mime_type_trigger ON storage.objects;
CREATE TRIGGER handle_mime_type_trigger
  BEFORE INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION handle_storage_mime_type();

-- Update storage policies
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