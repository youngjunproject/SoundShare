import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { SoundCard } from '../components/SoundCard';
import { AudioPlayer } from '../components/AudioPlayer';
import { supabase, checkSupabaseConnection } from '../lib/supabase';
import type { Sound } from '../types/sound';

export function Home() {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [currentSound, setCurrentSound] = useState<Sound | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'new' | 'top'>('new');
  const [retryCount, setRetryCount] = useState(0);

  const loadSounds = async () => {
    try {
      setLoading(true);
      setError(null);

      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        throw new Error('Unable to connect to the database. Please check your connection.');
      }

      const query = supabase
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
        `);

      if (sortBy === 'top') {
        query.order('upvotes', { ascending: false });
      } else {
        query.order('created_at', { ascending: false });
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      if (!data) {
        throw new Error('No data received from the server');
      }

      const soundsWithUsername = data.map(sound => ({
        ...sound,
        username: sound.profiles?.username || 'Anonymous'
      }));

      setSounds(soundsWithUsername);
      setRetryCount(0);
    } catch (err) {
      console.error('Error loading sounds:', err);
      setError('Failed to load sounds. Please try again later.');
      
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadSounds();
        }, 2000 * (retryCount + 1));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSounds();
  }, [sortBy]);

  const handleCommentCountChange = async () => {
    await loadSounds();
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

  if (error) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadSounds}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Discover Loops</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setSortBy('new')}
              className={`px-4 py-2 rounded-md ${
                sortBy === 'new'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              New
            </button>
            <button
              onClick={() => setSortBy('top')}
              className={`px-4 py-2 rounded-md ${
                sortBy === 'top'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Top
            </button>
          </div>
        </div>
        {sounds.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No sounds have been uploaded yet.</p>
            <p className="mt-2">Be the first to share your sound!</p>
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
      <AudioPlayer sound={currentSound} />
    </Layout>
  );
}