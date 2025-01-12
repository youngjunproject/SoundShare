/*
  # Add notifications system
  
  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `actor_id` (uuid, references profiles)
      - `type` (notification_type enum)
      - `sound_id` (uuid, optional, references sounds)
      - `comment_id` (uuid, optional, references comments)
      - `read` (boolean)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on notifications table
    - Add policies for notification access
*/

-- Create notification type enum
CREATE TYPE notification_type AS ENUM ('follow', 'comment', 'vote', 'mention');

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  sound_id uuid REFERENCES sounds(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Add policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to create follow notification
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'follow');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to create vote notification
CREATE OR REPLACE FUNCTION create_vote_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vote_type = 1 THEN -- Only notify on upvotes
    INSERT INTO notifications (
      user_id,
      actor_id,
      type,
      sound_id
    )
    SELECT 
      s.user_id,
      NEW.user_id,
      'vote',
      s.id
    FROM sounds s
    WHERE s.id = NEW.sound_id
    AND s.user_id != NEW.user_id; -- Don't notify if user votes on their own sound
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to create comment notification
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify sound owner of new comment
  INSERT INTO notifications (
    user_id,
    actor_id,
    type,
    sound_id,
    comment_id
  )
  SELECT 
    s.user_id,
    NEW.user_id,
    'comment',
    s.id,
    NEW.id
  FROM sounds s
  WHERE s.id = NEW.sound_id
  AND s.user_id != NEW.user_id; -- Don't notify if user comments on their own sound

  -- Notify mentioned users
  INSERT INTO notifications (
    user_id,
    actor_id,
    type,
    sound_id,
    comment_id
  )
  SELECT 
    p.id,
    NEW.user_id,
    'mention',
    NEW.sound_id,
    NEW.id
  FROM profiles p
  WHERE NEW.content LIKE '%@' || p.username || '%'
  AND p.id != NEW.user_id; -- Don't notify if user mentions themselves

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for notifications
CREATE TRIGGER on_follow
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_notification();

CREATE TRIGGER on_vote
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION create_vote_notification();

CREATE TRIGGER on_comment
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);