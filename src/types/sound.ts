export interface Sound {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  cover_url: string;
  user_id: string;
  username: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  duration: number;
  mime_type?: string;
  file_size?: number;
  processed: boolean;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface Vote {
  id: string;
  user_id: string;
  sound_id: string;
  vote_type: 1 | -1;
  created_at: string;
}

export interface Comment {
  id: string;
  sound_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url: string;
  bio: string;
  followers_count: number;
  following_count: number;
  sounds_count: number;
}