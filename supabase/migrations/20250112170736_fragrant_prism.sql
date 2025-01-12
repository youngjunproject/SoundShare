/*
  # Update Storage Configuration for Audio Files

  1. Changes
    - Update storage bucket configuration to support all audio MIME types
    - Add more permissive storage policies for audio files
    - Update bucket configuration for better file handling

  2. Security
    - Maintains existing RLS policies
    - Keeps file size limits for security
*/

-- Update bucket configuration to support all audio MIME types
UPDATE storage.buckets
SET public = true,
    file_size_limit = 104857600, -- 100MB
    allowed_mime_types = ARRAY[
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/ogg',
      'audio/webm',
      'audio/aac',
      'audio/flac',
      'audio/x-m4a',
      'audio/x-aiff',
      'audio/x-ms-wma',
      'audio/vnd.wave'
    ]
WHERE id = 'audio';

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
  );