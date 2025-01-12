/*
  # Add sounds count to profiles

  1. Changes
    - Add sounds_count column to profiles table
    - Create trigger to maintain sounds_count
    - Update existing profiles with correct counts

  2. Security
    - No changes to RLS policies
*/

-- Add sounds count to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS sounds_count bigint DEFAULT 0;

-- Create function to update sounds count
CREATE OR REPLACE FUNCTION update_sounds_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET sounds_count = sounds_count + 1 
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET sounds_count = sounds_count - 1 
    WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sounds count
CREATE TRIGGER update_sounds_count
  AFTER INSERT OR DELETE ON sounds
  FOR EACH ROW
  EXECUTE FUNCTION update_sounds_count();

-- Update existing profiles with correct counts
UPDATE profiles p
SET sounds_count = (
  SELECT COUNT(*)
  FROM sounds s
  WHERE s.user_id = p.id
);