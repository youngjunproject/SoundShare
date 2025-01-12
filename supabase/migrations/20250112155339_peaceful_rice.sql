/*
  # Add follows table and update profile functionality

  1. New Tables
    - `follows`
      - `id` (uuid, primary key)
      - `follower_id` (uuid, references profiles)
      - `following_id` (uuid, references profiles)
      - `created_at` (timestamp)

  2. Changes
    - Add follower/following counts to profiles table
    - Add triggers to maintain counts
    - Add RLS policies for follows table

  3. Security
    - Enable RLS on follows table
    - Add policies for viewing and managing follows
*/

-- Create follows table if it doesn't exist
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Add follower counts to profiles if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'followers_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN followers_count bigint DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'following_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN following_count bigint DEFAULT 0;
  END IF;
END $$;

-- Create function to update follower counts if it doesn't exist
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET followers_count = followers_count + 1 
    WHERE id = NEW.following_id;
    
    UPDATE profiles 
    SET following_count = following_count + 1 
    WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET followers_count = followers_count - 1 
    WHERE id = OLD.following_id;
    
    UPDATE profiles 
    SET following_count = following_count - 1 
    WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for follower counts if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_follower_counts'
  ) THEN
    CREATE TRIGGER update_follower_counts
      AFTER INSERT OR DELETE ON follows
      FOR EACH ROW
      EXECUTE FUNCTION update_follower_counts();
  END IF;
END $$;

-- Add policies for follows
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Anyone can view follows'
  ) THEN
    CREATE POLICY "Anyone can view follows"
      ON follows
      FOR SELECT
      TO public
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can follow others'
  ) THEN
    CREATE POLICY "Users can follow others"
      ON follows
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = follower_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can unfollow'
  ) THEN
    CREATE POLICY "Users can unfollow"
      ON follows
      FOR DELETE
      TO authenticated
      USING (auth.uid() = follower_id);
  END IF;
END $$;

-- Add indexes for better performance if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'follows_follower_id_idx'
  ) THEN
    CREATE INDEX follows_follower_id_idx ON follows(follower_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'follows_following_id_idx'
  ) THEN
    CREATE INDEX follows_following_id_idx ON follows(following_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'follows_created_at_idx'
  ) THEN
    CREATE INDEX follows_created_at_idx ON follows(created_at);
  END IF;
END $$;

-- Update existing follower counts
UPDATE profiles p
SET 
  followers_count = (
    SELECT COUNT(*) 
    FROM follows f 
    WHERE f.following_id = p.id
  ),
  following_count = (
    SELECT COUNT(*) 
    FROM follows f 
    WHERE f.follower_id = p.id
  );