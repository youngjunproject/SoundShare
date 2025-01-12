import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { AudioPlayer } from '../components/AudioPlayer';
import { CommentSection } from '../components/CommentSection';
import { VoteButtons } from '../components/VoteButtons';
import { supabase } from '../lib/supabase';
import type { Sound } from '../types/sound';

export function SoundDetails() {
  const { id } = useParams<{ id: string }>();
  const [sound, setSound] = useState<Sound | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<1 | -1 | null>(null);

  useEffect(() => {
    if (id) {
      loadSound();
      loadUserVote();
    }
  }, [id]);

  const loadSound = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sounds')
        .select(`
          *,
          profiles:user_id (username)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setSound({
        ...data,
        username: data.profiles?.username || 'Anonymous'
      });
    } catch (err) {
      console.error('Error loading sound:', err);
      setError('Failed to load sound');
    } finally {
      setLoading(false);
    }
  };

  const loadUserVote = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !id) return;

    const { data: vote } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('user_id', user.id)
      .eq('sound_id', id)
      .single();

    if (vote) {
      setUserVote(vote.vote_type);
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

  if (error || !sound) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">{error || 'Sound not found'}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div 
            className="h-64 bg-cover bg-center"
            style={{ backgroundImage: `url(${sound.cover_url})` }}
          />
          <div className="p-6">
            <div className="flex items-start space-x-4">
              <VoteButtons
                soundId={sound.id}
                upvotes={sound.upvotes}
                downvotes={sound.downvotes}
                userVote={userVote}
                onVoteChange={() => {
                  loadSound();
                  loadUserVote();
                }}
              />
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{sound.title}</h1>
                <p className="text-gray-500">by {sound.username}</p>
                {sound.description && (
                  <p className="mt-4 text-gray-700">{sound.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Comments</h2>
          <CommentSection 
            soundId={sound.id}
            onCommentCountChange={loadSound}
          />
        </div>
      </div>
      <AudioPlayer sound={sound} />
    </Layout>
  );
}