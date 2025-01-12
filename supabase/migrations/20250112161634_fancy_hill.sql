/*
  # Fix profile functionality

  1. Changes
    - Add missing indexes for profile lookups
    - Add text search capabilities
    - Ensure proper profile creation
    - Add missing RLS policies

  2. Security
    - Maintain existing RLS policies
    - Add new policies for better access control
*/

-- Enable text search capabilities if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add missing indexes for profile lookups
CREATE INDEX IF NOT EXISTS profiles_username_trgm_idx ON profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON profiles(created_at);

-- Fix any missing profiles
INSERT INTO profiles (id, username, created_at)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', 'user_' || substr(u.id::text, 1, 8)),
  COALESCE(u.created_at, now())
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Add missing RLS policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
CREATE POLICY "Anyone can view profiles"
  ON profiles
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Update existing profiles with default values
UPDATE profiles
SET 
  avatar_url = COALESCE(
    avatar_url,
    'https://ui-avatars.com/api/?name=' || username
  ),
  bio = COALESCE(bio, ''),
  followers_count = COALESCE(followers_count, 0),
  following_count = COALESCE(following_count, 0),
  sounds_count = COALESCE(sounds_count, 0)
WHERE avatar_url IS NULL 
   OR bio IS NULL 
   OR followers_count IS NULL 
   OR following_count IS NULL 
   OR sounds_count IS NULL;