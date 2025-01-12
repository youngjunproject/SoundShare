/*
  # Fix profile functionality

  1. Changes
    - Add missing indexes for profile lookups
    - Add text search capabilities
    - Ensure proper profile creation on signup

  2. Security
    - Maintain RLS policies
    - Keep existing constraints
*/

-- Enable text search capabilities
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add missing indexes for profile lookups
CREATE INDEX IF NOT EXISTS profiles_username_trgm_idx ON profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON profiles(created_at);

-- Ensure proper profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    avatar_url,
    created_at
  ) VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'username',
      'user_' || substr(new.id::text, 1, 8)
    ),
    COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      'https://ui-avatars.com/api/?name=' || COALESCE(new.raw_user_meta_data->>'username', 'User')
    ),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix any missing profiles
INSERT INTO profiles (id, username, created_at)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', 'user_' || substr(u.id::text, 1, 8)),
  COALESCE(u.created_at, now())
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;