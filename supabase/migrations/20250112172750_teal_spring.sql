/*
  # Fix MIME type handling for audio files

  1. Changes
    - Remove MIME type restrictions from storage bucket
    - Add better MIME type handling for audio files
    - Update storage policies
*/

-- Remove MIME type restrictions from audio bucket
UPDATE storage.buckets
SET allowed_mime_types = NULL
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

-- Add function to normalize MIME types
CREATE OR REPLACE FUNCTION normalize_mime_type(mime_type text)
RETURNS text AS $$
BEGIN
  CASE
    WHEN mime_type ILIKE '%mp3%' THEN
      RETURN 'audio/mpeg';
    WHEN mime_type ILIKE '%wav%' THEN
      RETURN 'audio/wav';
    WHEN mime_type ILIKE '%ogg%' THEN
      RETURN 'audio/ogg';
    WHEN mime_type ILIKE '%webm%' THEN
      RETURN 'audio/webm';
    WHEN mime_type ILIKE '%aac%' THEN
      RETURN 'audio/aac';
    WHEN mime_type ILIKE '%m4a%' THEN
      RETURN 'audio/mp4';
    ELSE
      RETURN mime_type;
  END CASE;
END;
$$ LANGUAGE plpgsql;