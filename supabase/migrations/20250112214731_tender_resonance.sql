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

-- Create some test sounds with reliable audio URLs
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
  'https://cdn.pixabay.com/download/audio/2022/02/22/audio_d1718ab41b.mp3',
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
  'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3',
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
  'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
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