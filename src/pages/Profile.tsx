import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { SoundCard } from '../components/SoundCard';
import { AudioPlayer } from '../components/AudioPlayer';
import { supabase, checkSupabaseConnection } from '../lib/supabase';
import { Music, Users, Calendar } from 'lucide-react';
import type { Sound, Profile as ProfileType } from '../types/sound';

export function Profile() {
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [currentSound, setCurrentSound] = useState<Sound | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadSounds = async (profileId: string) => {
    try {
      const { data: soundsData, error: soundsError } = await supabase
        .from('sounds')
        .select(`
          id,
          title,
          description,
          audio_url,
          cover_url,
          user_id,
          created_at,
          upvotes,
          downvotes,
          duration,
          comment_count,
          profiles:user_id (username)
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      if (soundsError) {
        console.error('Error loading sounds:', soundsError);
        throw soundsError;
      }

      const soundsWithUsername = (soundsData || []).map(sound => ({
        ...sound,
        username: sound.profiles?.username || 'Anonymous'
      }));

      setSounds(soundsWithUsername);
    } catch (err) {
      console.error('Error loading sounds:', err);
      throw err;
    }
  };

  const loadProfile = async () => {
    if (!username) return;
    
    try {
      setLoading(true);
      setError(null);

      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        throw new Error('Unable to connect to the database. Please check your connection.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setCurrentUserId(user.id);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          avatar_url,
          bio,
          created_at,
          followers_count,
          following_count,
          sounds_count
        `)
        .eq('username', username)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        throw new Error('Profile not found');
      }

      if (!profileData) {
        throw new Error('Profile not found');
      }

      setProfile(profileData);
      setIsCurrentUser(profileData.id === user.id);

      await loadSounds(profileData.id);

      if (profileData.id !== user.id) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.id)
          .single();
        
        setIsFollowing(!!followData);
      }
    } catch (err) {
      console.error('Error in loadProfile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!username) {
      setError('No username provided');
      setLoading(false);
      return;
    }
    loadProfile();
  }, [username]);

  const handleCommentCountChange = async () => {
    if (profile) {
      await loadSounds(profile.id);
    }
  };

  const handleFollow = async () => {
    if (!profile || !currentUserId) return;

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', profile.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('follows')
          .insert([{
            follower_id: currentUserId,
            following_id: profile.id
          }]);

        if (error) throw error;
      }

      setIsFollowing(!isFollowing);
      loadProfile();
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </Layout>
    );
  }

  if (error || !profile) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">{error || 'Profile not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Return Home
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600" />
          <div className="relative px-6 py-8">
            <div className="absolute -top-12 left-6">
              <div className="h-24 w-24 rounded-full bg-white p-1">
                <div 
                  className="h-full w-full rounded-full bg-cover bg-center"
                  style={{ 
                    backgroundImage: profile.avatar_url 
                      ? `url(${profile.avatar_url})` 
                      : `url(https://ui-avatars.com/api/?name=${profile.username}&background=random)`
                  }}
                />
              </div>
            </div>
            <div className="ml-32 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profile.username}</h1>
                {profile.bio && (
                  <p className="mt-2 text-gray-600">{profile.bio}</p>
                )}
                <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Music className="h-4 w-4 mr-1" />
                    <span>{profile.sounds_count || 0} Sounds</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{profile.followers_count || 0} Followers</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              {!isCurrentUser && (
                <button
                  onClick={handleFollow}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    isFollowing
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Sounds</h2>
          {sounds.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">No sounds uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sounds.map((sound) => (
                <SoundCard 
                  key={sound.id} 
                  sound={sound} 
                  onPlay={setCurrentSound}
                  onCommentCountChange={handleCommentCountChange}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <AudioPlayer sound={currentSound} />
    </Layout>
  );
}