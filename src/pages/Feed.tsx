import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { SoundCard } from '../components/SoundCard';
import { AudioPlayer } from '../components/AudioPlayer';
import { supabase } from '../lib/supabase';
import { Flame, Users, Clock } from 'lucide-react';
import type { Sound } from '../types/sound';

type FeedSection = 'following' | 'trending' | 'recent';

export function Feed() {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [currentSound, setCurrentSound] = useState<Sound | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<FeedSection>('following');

  useEffect(() => {
    loadSounds();
  }, [activeSection]);

  const loadSounds = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('sounds')
        .select(`
          *,
          profiles:user_id (username)
        `);

      switch (activeSection) {
        case 'following':
          // Get sounds from users you follow
          const { data: followingIds } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);

          if (followingIds && followingIds.length > 0) {
            query = query.in(
              'user_id', 
              followingIds.map(f => f.following_id)
            );
          } else {
            // If not following anyone, return empty array
            setSounds([]);
            setLoading(false);
            return;
          }
          break;

        case 'trending':
          // Get sounds with most upvotes in last 7 days
          query = query
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order('upvotes', { ascending: false });
          break;

        case 'recent':
          // Get most recent sounds
          query = query.order('created_at', { ascending: false });
          break;
      }

      // Limit to 20 sounds per section
      const { data: soundsData, error } = await query.limit(20);

      if (error) throw error;

      const soundsWithUsername = soundsData.map(sound => ({
        ...sound,
        username: sound.profiles?.username || 'Anonymous'
      }));

      setSounds(soundsWithUsername);
    } catch (err) {
      console.error('Error loading sounds:', err);
      setError('Failed to load sounds');
    } finally {
      setLoading(false);
    }
  };

  const SectionButton = ({ section, icon: Icon, label }: { 
    section: FeedSection; 
    icon: React.ElementType; 
    label: string;
  }) => (
    <button
      onClick={() => setActiveSection(section)}
      className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        activeSection === section
          ? 'bg-indigo-600 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon className="h-4 w-4 mr-2" />
      {label}
    </button>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Feed</h1>
          <div className="flex space-x-4">
            <SectionButton
              section="following"
              icon={Users}
              label="Following"
            />
            <SectionButton
              section="trending"
              icon={Flame}
              label="Trending"
            />
            <SectionButton
              section="recent"
              icon={Clock}
              label="Recent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadSounds}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        ) : sounds.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            {activeSection === 'following' ? (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No sounds from people you follow
                </h3>
                <p className="text-gray-500">
                  Follow more creators to see their sounds in your feed
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No sounds available
                </h3>
                <p className="text-gray-500">
                  Check back later for new content
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sounds.map((sound) => (
              <SoundCard 
                key={sound.id} 
                sound={sound} 
                onPlay={setCurrentSound}
              />
            ))}
          </div>
        )}
      </div>
      <AudioPlayer sound={currentSound} />
    </Layout>
  );
}