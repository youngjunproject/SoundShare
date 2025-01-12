/*
  # Create sounds table and storage

  1. New Tables
    - `sounds`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `audio_url` (text)
      - `cover_url` (text)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `likes` (integer)
      - `duration` (float)

  2. Security
    - Enable RLS on `sounds` table
    - Add policies for CRUD operations
    - Create storage buckets for audio and images
*/

-- Create sounds table
CREATE TABLE IF NOT EXISTS sounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  audio_url text NOT NULL,
  cover_url text NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  likes integer DEFAULT 0,
  duration float
);

-- Enable RLS
ALTER TABLE sounds ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view sounds"
  ON sounds
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create sounds"
  ON sounds
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sounds"
  ON sounds
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sounds"
  ON sounds
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name)
VALUES ('audio', 'audio')
ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name)
VALUES ('images', 'images')
ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view audio"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'audio');

CREATE POLICY "Anyone can view images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can upload audio"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'audio');

CREATE POLICY "Authenticated users can upload images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');