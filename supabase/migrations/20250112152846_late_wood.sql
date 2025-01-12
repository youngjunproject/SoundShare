/*
  # Fix audio storage and playback

  1. Changes
    - Add MIME type and file size columns to sounds table
    - Add validation triggers for file uploads
    - Update storage policies for better file handling

  2. Security
    - Add validation checks for file uploads
    - Enforce MIME type restrictions
*/

-- Add new columns for better file handling
ALTER TABLE sounds 
ADD COLUMN IF NOT EXISTS mime_type text,
ADD COLUMN IF NOT EXISTS file_size bigint,
ADD COLUMN IF NOT EXISTS processed boolean DEFAULT false;

-- Create an enum for audio processing status
CREATE TYPE audio_status AS ENUM ('pending', 'processing', 'completed', 'failed');
ALTER TABLE sounds 
ADD COLUMN IF NOT EXISTS processing_status audio_status DEFAULT 'pending';

-- Add validation check for mime types
ALTER TABLE sounds
ADD CONSTRAINT valid_mime_type 
CHECK (mime_type = ANY(ARRAY[
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm'
]));

-- Update storage policies for better file handling
CREATE OR REPLACE FUNCTION handle_new_audio()
RETURNS trigger AS $$
BEGIN
  -- Validate mime type
  IF NEW.mime_type IS NULL OR NEW.mime_type NOT IN (
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm'
  ) THEN
    RAISE EXCEPTION 'Invalid audio mime type';
  END IF;

  -- Validate file size (100MB limit)
  IF NEW.file_size > 100 * 1024 * 1024 THEN
    RAISE EXCEPTION 'File size exceeds 100MB limit';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for audio validation
DROP TRIGGER IF EXISTS validate_audio_upload ON sounds;
CREATE TRIGGER validate_audio_upload
  BEFORE INSERT OR UPDATE ON sounds
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_audio();

-- Update storage policies
DROP POLICY IF EXISTS "Anyone can view audio" ON storage.objects;
CREATE POLICY "Anyone can view audio"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'audio' 
    AND (storage.foldername(name))[1] = 'sounds'
  );

DROP POLICY IF EXISTS "Authenticated users can upload audio" ON storage.objects;
CREATE POLICY "Authenticated users can upload audio"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'audio'
    AND (storage.foldername(name))[1] = 'sounds'
    AND (lower(storage.extension(name)) = ANY(ARRAY['mp3', 'wav', 'ogg', 'webm']))
  );

-- Update bucket configuration
UPDATE storage.buckets
SET public = true,
    file_size_limit = 104857600, -- 100MB
    allowed_mime_types = ARRAY[
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/ogg',
      'audio/webm'
    ]
WHERE id = 'audio';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS sounds_processing_status_idx ON sounds(processing_status);
CREATE INDEX IF NOT EXISTS sounds_processed_idx ON sounds(processed);