/*
  # Create test data

  1. New Data
    - Test user in auth.users
    - Test profile
    - Sample sounds
    - Sample comments
  
  2. Changes
    - Uses proper UUID format for all IDs
    - Ensures proper foreign key relationships
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
  '12345678-1234-1234-1234-123456789abc',
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '+1234567890',
  now(),
  jsonb_build_object(
    'username', 'testuser',
    'avatar_url', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'
  )
) ON CONFLICT (id) DO NOTHING;

-- The profile will be created automatically by the handle_new_user trigger
-- But let's update it with additional information
UPDATE profiles 
SET 
  bio = 'Music producer and sound designer. Creating ambient soundscapes and electronic beats.',
  avatar_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'
WHERE id = '12345678-1234-1234-1234-123456789abc';

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
  'abcdef12-3456-7890-abcd-ef1234567890',
  'Ambient Forest Morning',
  'Peaceful morning sounds recorded in a forest with birds chirping and gentle wind.',
  'https://assets.mixkit.co/music/preview/mixkit-forest-stream-1186.mp3',
  'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800',
  '12345678-1234-1234-1234-123456789abc',
  42,
  3,
  180,
  true,
  'completed',
  'audio/mpeg',
  2097152
),
(
  'bcdef123-4567-8901-bcde-f12345678901',
  'Electronic Dreams',
  'A journey through synthesized soundscapes and electronic rhythms.',
  'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
  'https://images.unsplash.com/photo-1593697972672-aa11889c7f90?w=800',
  '12345678-1234-1234-1234-123456789abc',
  28,
  5,
  240,
  true,
  'completed',
  'audio/mpeg',
  3145728
),
(
  'cdef1234-5678-9012-cdef-123456789012',
  'Urban Night',
  'City sounds mixed with deep bass and atmospheric pads.',
  'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
  'https://images.unsplash.com/photo-1515263487990-61b07816b324?w=800',
  '12345678-1234-1234-1234-123456789abc',
  35,
  2,
  195,
  true,
  'completed',
  'audio/mpeg',
  2621440
);

-- Add some comments
INSERT INTO comments (
  id,
  user_id,
  sound_id,
  content
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  '12345678-1234-1234-1234-123456789abc',
  'abcdef12-3456-7890-abcd-ef1234567890',
  'This is exactly the kind of ambient sound I was looking for!'
),
(
  '22222222-2222-2222-2222-222222222222',
  '12345678-1234-1234-1234-123456789abc',
  'bcdef123-4567-8901-bcde-f12345678901',
  'The synth work on this is incredible!'
);