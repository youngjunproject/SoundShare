import React, { useState } from 'react';
import { ArrowBigUp, ArrowBigDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface VoteButtonsProps {
  soundId: string;
  upvotes: number;
  downvotes: number;
  userVote?: 1 | -1 | null;
  onVoteChange?: () => void;
}

export function VoteButtons({ soundId, upvotes: initialUpvotes, downvotes: initialDownvotes, userVote: initialUserVote, onVoteChange }: VoteButtonsProps) {
  const [localUpvotes, setLocalUpvotes] = useState(initialUpvotes);
  const [localDownvotes, setLocalDownvotes] = useState(initialDownvotes);
  const [localUserVote, setLocalUserVote] = useState(initialUserVote);

  const handleVote = async (voteType: 1 | -1) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in to vote');
        return;
      }

      // Calculate vote changes based on current state
      let upvoteChange = 0;
      let downvoteChange = 0;

      if (localUserVote === voteType) {
        // Remove vote
        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('user_id', user.id)
          .eq('sound_id', soundId);

        if (error) throw error;

        if (voteType === 1) {
          upvoteChange = -1;
        } else {
          downvoteChange = -1;
        }
        setLocalUserVote(null);
      } else if (localUserVote) {
        // Update vote
        const { error } = await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('user_id', user.id)
          .eq('sound_id', soundId);

        if (error) throw error;

        if (voteType === 1) {
          upvoteChange = 1;
          downvoteChange = -1;
        } else {
          upvoteChange = -1;
          downvoteChange = 1;
        }
        setLocalUserVote(voteType);
      } else {
        // Insert new vote
        const { error } = await supabase
          .from('votes')
          .insert([{
            user_id: user.id,
            sound_id: soundId,
            vote_type: voteType
          }]);

        if (error) throw error;

        if (voteType === 1) {
          upvoteChange = 1;
        } else {
          downvoteChange = 1;
        }
        setLocalUserVote(voteType);
      }

      // Update local vote counts
      setLocalUpvotes(prev => prev + upvoteChange);
      setLocalDownvotes(prev => prev + downvoteChange);

      // Notify parent component
      onVoteChange?.();
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to vote. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center space-y-1">
      <button
        onClick={() => handleVote(1)}
        className={`p-1 rounded-full transition-colors ${
          localUserVote === 1
            ? 'text-orange-500 hover:bg-orange-100'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
        aria-label="Upvote"
      >
        <ArrowBigUp className="h-6 w-6" />
      </button>
      <span className="text-sm font-medium text-gray-900">
        {localUpvotes - localDownvotes}
      </span>
      <button
        onClick={() => handleVote(-1)}
        className={`p-1 rounded-full transition-colors ${
          localUserVote === -1
            ? 'text-blue-500 hover:bg-blue-100'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
        aria-label="Downvote"
      >
        <ArrowBigDown className="h-6 w-6" />
      </button>
    </div>
  );
}