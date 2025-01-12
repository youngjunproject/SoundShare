/*
  # Create test data with conflict handling

  1. New Data
    - Test user in auth.users with ON CONFLICT handling
    - Test profile with ON CONFLICT handling
    - Sample sounds with new UUIDs and ON CONFLICT handling
    - Sample comments with new UUIDs
  
  2. Changes
    - Uses new UUIDs for all records
    - Adds ON CONFLICT clauses to handle duplicates
*/

-- First create the auth user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  raw_user_meta_data
) VALUES (
  '98765432-1234-5678-9012-345678901234',
  '00000000-0000-0000-0000-000000000000',
  'test2@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '+1234567891',
  now(),
  jsonb_build_object(
    'username', 'testuser2',
    'avatar_url', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'
  )
) ON CONFLICT (id) DO NOTHING;

-- The profile will be created automatically by the handle_new_user trigger
-- But let's update it with additional information
UPDATE profiles 
SET 
  bio = 'Music producer and sound designer. Creating ambient soundscapes and electronic beats.',
  avatar_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'
WHERE id = '98765432-1234-5678-9012-345678901234';

-- Create some test sounds
INSERT INTO sounds (
  id, 
  title, 
  description, 
  audio_url, 
  cover_url, 
  user_id,
  upvotes,
  downvotes,
  duration,
  processed,
  processing_status,
  mime_type,
  file_size
) VALUES 
(
  '98765432-3456-7890-1234-567890123456',
  'Ambient Forest Morning',
  'Peaceful morning sounds recorded in a forest with birds chirping and gentle wind.',
  'https://github.com/anars/blank-audio/raw/master/15-seconds-of-silence.mp3',
  'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800',
  '98765432-1234-5678-9012-345678901234',
  42,
  3,
  180,
  true,
  'completed',
  'audio/mpeg',
  2097152
),
(
  '98765432-4567-8901-2345-678901234567',
  'Electronic Dreams',
  'A journey through synthesized soundscapes and electronic rhythms.',
  'https://github.com/anars/blank-audio/raw/master/10-seconds-of-silence.mp3',
  'https://images.unsplash.com/photo-1593697972672-aa11889c7f90?w=800',
  '98765432-1234-5678-9012-345678901234',
  28,
  5,
  240,
  true,
  'completed',
  'audio/mpeg',
  3145728
),
(
  '98765432-5678-9012-3456-789012345678',
  'Urban Night',
  'City sounds mixed with deep bass and atmospheric pads.',
  'https://github.com/anars/blank-audio/raw/master/1-minute-of-silence.mp3',
  'https://images.unsplash.com/photo-1515263487990-61b07816b324?w=800',
  '98765432-1234-5678-9012-345678901234',
  35,
  2,
  195,
  true,
  'completed',
  'audio/mpeg',
  2621440
) ON CONFLICT (id) DO NOTHING;

-- Add some comments
INSERT INTO comments (
  id,
  user_id,
  sound_id,
  content
) VALUES 
(
  '98765432-6789-0123-4567-890123456789',
  '98765432-1234-5678-9012-345678901234',
  '98765432-3456-7890-1234-567890123456',
  'This is exactly the kind of ambient sound I was looking for!'
),
(
  '98765432-7890-1234-5678-901234567890',
  '98765432-1234-5678-9012-345678901234',
  '98765432-4567-8901-2345-678901234567',
  'The synth work on this is incredible!'
) ON CONFLICT (id) DO NOTHING;