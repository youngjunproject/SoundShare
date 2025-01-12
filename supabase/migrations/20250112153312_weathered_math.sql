/*
  # Add voting system
  
  1. New Tables
    - `votes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `sound_id` (uuid, references sounds)
      - `vote_type` (smallint, 1 for upvote, -1 for downvote)
      - `created_at` (timestamp)
  
  2. Changes
    - Add vote count to sounds table
    - Add function to update vote counts
    
  3. Security
    - Enable RLS
    - Add policies for vote management
*/

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sound_id uuid REFERENCES sounds(id) ON DELETE CASCADE NOT NULL,
  vote_type smallint NOT NULL CHECK (vote_type = 1 OR vote_type = -1),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, sound_id)
);

-- Enable RLS
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Add vote count to sounds
ALTER TABLE sounds 
ADD COLUMN IF NOT EXISTS upvotes bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS downvotes bigint DEFAULT 0;

-- Create function to update vote counts
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update vote counts on insert
    IF NEW.vote_type = 1 THEN
      UPDATE sounds SET upvotes = upvotes + 1 WHERE id = NEW.sound_id;
    ELSE
      UPDATE sounds SET downvotes = downvotes + 1 WHERE id = NEW.sound_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update vote counts on delete
    IF OLD.vote_type = 1 THEN
      UPDATE sounds SET upvotes = upvotes - 1 WHERE id = OLD.sound_id;
    ELSE
      UPDATE sounds SET downvotes = downvotes - 1 WHERE id = OLD.sound_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.vote_type != NEW.vote_type THEN
    -- Update vote counts on vote type change
    IF NEW.vote_type = 1 THEN
      UPDATE sounds SET 
        upvotes = upvotes + 1,
        downvotes = downvotes - 1
      WHERE id = NEW.sound_id;
    ELSE
      UPDATE sounds SET 
        upvotes = upvotes - 1,
        downvotes = downvotes + 1
      WHERE id = NEW.sound_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vote counts
CREATE TRIGGER update_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_vote_counts();

-- Add policies for votes
CREATE POLICY "Users can vote"
  ON votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change their votes"
  ON votes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their votes"
  ON votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view votes"
  ON votes
  FOR SELECT
  TO public
  USING (true);