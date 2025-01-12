import React, { useState, useEffect } from 'react';
import { Play, MessageCircle, Download, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { VoteButtons } from './VoteButtons';
import { getTokensRemaining, consumeToken } from '../lib/tokens';
import type { Sound } from '../types/sound';

interface SoundCardProps {
  sound: Sound;
  onPlay: (sound: Sound) => void;
  onCommentCountChange?: () => void;
}

export function SoundCard({ sound, onPlay, onCommentCountChange }: SoundCardProps) {
  const [userVote, setUserVote] = useState<1 | -1 | null>(null);
  const [tokensRemaining, setTokensRemaining] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    loadUserVote();
    loadTokens();
  }, [sound.id]);

  const loadTokens = async () => {
    const tokens = await getTokensRemaining();
    setTokensRemaining(tokens);
  };

  const loadUserVote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: votes, error } = await supabase
        .from('votes')
        .select('vote_type')
        .eq('user_id', user.id)
        .eq('sound_id', sound.id);

      if (error) {
        console.error('Error loading vote:', error);
        return;
      }

      if (votes && votes.length > 0) {
        setUserVote(votes[0].vote_type);
      } else {
        setUserVote(null);
      }
    } catch (error) {
      console.error('Error loading vote:', error);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in to download sounds');
        return;
      }

      // Try to consume a token
      const success = await consumeToken();
      if (!success) {
        alert('No download tokens remaining. Please purchase more tokens to continue downloading.');
        return;
      }

      // Proceed with download
      const response = await fetch(sound.audio_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sound.title}.${sound.mime_type?.split('/')[1] || 'mp3'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Refresh token count
      await loadTokens();
    } catch (error) {
      console.error('Error downloading sound:', error);
      alert('Failed to download sound. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div 
        className="h-48 bg-gradient-to-r from-indigo-500 to-purple-600 relative cursor-pointer group flex items-center justify-center"
        onClick={() => onPlay(sound)}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
          <Play className="h-16 w-16 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start space-x-4">
          <VoteButtons
            soundId={sound.id}
            upvotes={sound.upvotes}
            downvotes={sound.downvotes}
            userVote={userVote}
            onVoteChange={loadUserVote}
          />
          <div className="flex-1">
            <Link to={`/sound/${sound.id}`}>
              <h3 className="text-lg font-semibold text-gray-900 hover:text-indigo-600 truncate">
                {sound.title}
              </h3>
            </Link>
            <p className="text-sm text-gray-500 mb-4">
              by{' '}
              <Link 
                to={`/profile/${sound.username}`}
                className="hover:text-indigo-600 hover:underline"
              >
                {sound.username}
              </Link>
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <Link
                to={`/sound/${sound.id}`}
                className="flex items-center space-x-1 hover:text-indigo-600"
                onClick={onCommentCountChange}
              >
                <MessageCircle className="h-4 w-4" />
                <span>
                  {sound.comment_count || 0} {sound.comment_count === 1 ? 'Comment' : 'Comments'}
                </span>
              </Link>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center space-x-1 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
                <span className="flex items-center text-xs text-gray-500 group-hover:text-indigo-600">
                  <Coins className="h-3 w-3 ml-1" />
                  {tokensRemaining}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}