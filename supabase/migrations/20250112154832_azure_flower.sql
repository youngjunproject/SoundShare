/*
  # Fix profile data and add missing columns

  1. Changes
    - Add missing columns to profiles table
    - Update existing profiles with default values
    - Add indexes for better performance
*/

-- Add missing columns if they don't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS bio text;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- Update any null usernames with a default value
UPDATE profiles
SET username = 'user_' || substr(id::text, 1, 8)
WHERE username IS NULL;

-- Ensure username is required and unique
ALTER TABLE profiles
ALTER COLUMN username SET NOT NULL,
ADD CONSTRAINT profiles_username_unique UNIQUE (username);