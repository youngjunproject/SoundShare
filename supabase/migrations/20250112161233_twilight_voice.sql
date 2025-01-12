/*
  # Fix sound upload validation

  1. Changes
    - Remove the trigger-based mime type validation
    - Add proper mime type check constraint
    - Update storage policies for better file handling

  2. Security
    - Maintain RLS policies
    - Keep file size limits
    - Ensure proper mime type validation
*/

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS validate_audio_upload ON sounds;
DROP FUNCTION IF EXISTS handle_new_audio;

-- Update the mime_type constraint
ALTER TABLE sounds DROP CONSTRAINT IF EXISTS valid_mime_type;
ALTER TABLE sounds ADD CONSTRAINT valid_mime_type 
CHECK (
  mime_type IS NULL OR 
  mime_type IN (
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/webm'
  )
);

-- Update storage policies for better file handling
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