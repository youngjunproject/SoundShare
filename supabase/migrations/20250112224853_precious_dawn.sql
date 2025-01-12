/*
  # Fix token system and database issues

  1. Changes
    - Add missing indexes for better performance
    - Fix token consumption function
    - Add token purchase functionality
    - Add transaction support for token operations
    - Add audit logging for token operations

  2. Security
    - Add RLS policies for token operations
    - Add validation checks
*/

-- Create audit log for token operations
CREATE TABLE IF NOT EXISTS token_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  operation_type text NOT NULL,
  tokens_changed integer NOT NULL,
  tokens_remaining integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE token_audit_log ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for audit log
CREATE POLICY "Users can view their own audit log"
  ON token_audit_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Improve token consumption function with better error handling and audit logging
CREATE OR REPLACE FUNCTION consume_download_token(user_id uuid)
RETURNS boolean AS $$
DECLARE
  tokens_available integer;
BEGIN
  -- Start transaction
  BEGIN
    -- Get current token count with lock
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

      -- Log the operation
      INSERT INTO token_audit_log (
        user_id,
        operation_type,
        tokens_changed,
        tokens_remaining
      ) VALUES (
        user_id,
        'consume',
        -1,
        tokens_available - 1
      );

      RETURN true;
    END IF;
    
    RETURN false;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error and rollback
      RAISE LOG 'Error in consume_download_token: %', SQLERRM;
      RETURN false;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to purchase tokens
CREATE OR REPLACE FUNCTION purchase_tokens(
  user_id uuid,
  amount integer
)
RETURNS boolean AS $$
DECLARE
  current_tokens integer;
BEGIN
  IF amount <= 0 THEN
    RETURN false;
  END IF;

  -- Start transaction
  BEGIN
    -- Get current token count with lock
    SELECT tokens_remaining INTO current_tokens
    FROM download_tokens
    WHERE download_tokens.user_id = purchase_tokens.user_id
    FOR UPDATE;
    
    -- Add tokens
    UPDATE download_tokens
    SET 
      tokens_remaining = tokens_remaining + amount,
      updated_at = now()
    WHERE download_tokens.user_id = purchase_tokens.user_id;

    -- Log the operation
    INSERT INTO token_audit_log (
      user_id,
      operation_type,
      tokens_changed,
      tokens_remaining
    ) VALUES (
      user_id,
      'purchase',
      amount,
      current_tokens + amount
    );

    RETURN true;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error and rollback
      RAISE LOG 'Error in purchase_tokens: %', SQLERRM;
      RETURN false;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS download_tokens_user_id_idx ON download_tokens(user_id);
CREATE INDEX IF NOT EXISTS token_audit_log_user_id_idx ON token_audit_log(user_id);
CREATE INDEX IF NOT EXISTS token_audit_log_created_at_idx ON token_audit_log(created_at);

-- Update existing tokens table with better constraints
ALTER TABLE download_tokens
ADD CONSTRAINT tokens_remaining_check CHECK (tokens_remaining >= 0);

-- Initialize missing tokens for any users
INSERT INTO download_tokens (user_id, tokens_remaining)
SELECT id, 10
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM download_tokens dt WHERE dt.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;