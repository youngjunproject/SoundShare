-- Remove all MIME type restrictions and ensure proper content type handling
UPDATE storage.buckets
SET allowed_mime_types = NULL,
    public = true,
    file_size_limit = 104857600 -- 100MB
WHERE id = 'audio';

-- Create a more robust function to handle MIME types
CREATE OR REPLACE FUNCTION handle_storage_mime_type()
RETURNS trigger AS $$
DECLARE
  file_ext text;
  mime_type text;
BEGIN
  -- Get file extension
  file_ext := lower(right(NEW.name, 4));
  
  -- Map file extensions to correct MIME types
  CASE file_ext
    WHEN '.mp3' THEN mime_type := 'audio/mpeg';
    WHEN '.wav' THEN mime_type := 'audio/x-wav';
    WHEN '.ogg' THEN mime_type := 'audio/ogg';
    WHEN '.m4a' THEN mime_type := 'audio/mp4';
    WHEN '.aac' THEN mime_type := 'audio/aac';
    WHEN 'webm' THEN mime_type := 'audio/webm';
    ELSE mime_type := 'audio/mpeg'; -- Default to audio/mpeg
  END CASE;

  -- Set the correct MIME type in metadata
  NEW.metadata := jsonb_set(
    COALESCE(NEW.metadata, '{}'::jsonb),
    '{mimetype}'::text[],
    to_jsonb(mime_type)
  );

  -- Set content-type header
  NEW.metadata := jsonb_set(
    NEW.metadata,
    '{httpMetadata,contentType}'::text[],
    to_jsonb(mime_type)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger with the updated function
DROP TRIGGER IF EXISTS handle_mime_type_trigger ON storage.objects;
CREATE TRIGGER handle_mime_type_trigger
  BEFORE INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION handle_storage_mime_type();

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

-- Update existing audio files with correct MIME types
UPDATE storage.objects
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{mimetype}'::text[],
  to_jsonb(
    CASE 
      WHEN lower(right(name, 4)) = '.mp3' THEN 'audio/mpeg'
      WHEN lower(right(name, 4)) = '.wav' THEN 'audio/x-wav'
      WHEN lower(right(name, 4)) = '.ogg' THEN 'audio/ogg'
      WHEN lower(right(name, 4)) = '.m4a' THEN 'audio/mp4'
      WHEN lower(right(name, 4)) = '.aac' THEN 'audio/aac'
      WHEN lower(right(name, 4)) = 'webm' THEN 'audio/webm'
      ELSE 'audio/mpeg'
    END
  )
)
WHERE bucket_id = 'audio';