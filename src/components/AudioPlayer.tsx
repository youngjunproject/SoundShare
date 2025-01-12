import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTokensRemaining, consumeToken } from '../lib/tokens';
import type { Sound } from '../types/sound';

interface AudioPlayerProps {
  sound: Sound | null;
}

export function AudioPlayer({ sound }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokensRemaining, setTokensRemaining] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (sound) {
      loadTokens();
      setIsLoading(true);
      setError(null);
      setIsPlaying(false);
      
      if (audioRef.current) {
        console.log('Loading audio URL:', sound.audio_url);
        audioRef.current.src = sound.audio_url;
        audioRef.current.load();
      }
    }
  }, [sound]);

  const loadTokens = async () => {
    const tokens = await getTokensRemaining();
    setTokensRemaining(tokens);
  };

  const handleLoadError = (e: ErrorEvent) => {
    console.error('Audio loading error:', e);
    console.error('Audio element error:', audioRef.current?.error);
    console.error('Sound details:', sound);
    
    setIsLoading(false);
    
    let errorMessage = 'Unable to load audio. Please try again later.';
    
    if (audioRef.current?.error) {
      switch (audioRef.current.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Audio loading was aborted.';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = `Network error loading audio from: ${sound?.audio_url}`;
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = `The audio file is corrupted or format is not supported (MIME type: ${sound?.mime_type || 'unknown'})`;
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = `This audio format is not supported (MIME type: ${sound?.mime_type || 'unknown'}, URL: ${sound?.audio_url})`;
          break;
      }
    }
    
    setError(errorMessage);
  };

  const togglePlay = async () => {
    if (audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
            setIsPlaying(true);
          }
        }
      } catch (err) {
        console.error('Error playing audio:', err);
        setError('Failed to play audio. Please try again.');
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleDownload = async () => {
    if (!sound) return;
    
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

  if (!sound) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={togglePlay}
            disabled={isLoading || !!error}
            className={`p-2 rounded-full ${
              isLoading || error
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
            }`}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </button>
          <button
            onClick={toggleMute}
            disabled={isLoading || !!error}
            className={`p-2 rounded-full ${
              isLoading || error
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
            }`}
          >
            {isMuted ? (
              <VolumeX className="h-6 w-6" />
            ) : (
              <Volume2 className="h-6 w-6" />
            )}
          </button>
          <div>
            <h3 className="text-sm font-medium text-gray-900">{sound.title}</h3>
            <p className="text-xs text-gray-500">
              by{' '}
              <Link 
                to={`/profile/${sound.username}`}
                className="hover:text-indigo-600 hover:underline"
              >
                {sound.username}
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center px-3 py-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <Download className="h-4 w-4 mr-1" />
            <span>Download</span>
            <span className="flex items-center text-xs text-gray-500 group-hover:text-indigo-600">
              <Coins className="h-3 w-3 ml-1" />
              {tokensRemaining}
            </span>
          </button>
          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
        </div>

        <audio
          ref={audioRef}
          onCanPlay={() => {
            console.log('Audio can play:', sound.title);
            setIsLoading(false);
          }}
          onError={(e) => handleLoadError(e as unknown as ErrorEvent)}
          onEnded={() => setIsPlaying(false)}
          preload="auto"
          crossOrigin="anonymous"
        />
      </div>
    </div>
  );
}