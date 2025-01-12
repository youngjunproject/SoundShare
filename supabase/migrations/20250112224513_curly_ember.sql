/*
  # Add token system for downloads

  1. New Tables
    - `download_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `tokens_remaining` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
  2. Functions
    - Function to initialize tokens for new users
    - Function to check and consume tokens
    
  3. Triggers
    - Trigger to create initial tokens for new users
*/

-- Create download_tokens table
CREATE TABLE IF NOT EXISTS download_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tokens_remaining integer NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE download_tokens ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view their own tokens"
  ON download_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create and update tokens"
  ON download_tokens
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to initialize tokens for new users
CREATE OR REPLACE FUNCTION initialize_user_tokens()
RETURNS trigger AS $$
BEGIN
  INSERT INTO download_tokens (user_id, tokens_remaining)
  VALUES (NEW.id, 10)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to initialize tokens for new users
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_tokens();

-- Initialize tokens for existing users
INSERT INTO download_tokens (user_id, tokens_remaining)
SELECT id, 10
FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- Create function to consume a token
CREATE OR REPLACE FUNCTION consume_download_token(user_id uuid)
RETURNS boolean AS $$
DECLARE
  tokens_available integer;
BEGIN
  -- Get current token count
  SELECT tokens_remaining INTO tokens_available
  FROM download_tokens
  WHERE download_tokens.user_id = consume_download_token.user_id
  FOR UPDATE;
  
  -- Check if tokens are available
  IF tokens_available > 0 THEN
    -- Consume one token
    UPDATE download_tokens
    SET 
      tokens_remaining = tokens_remaining - 1,
      updated_at = now()
    WHERE download_tokens.user_id = consume_download_token.user_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;