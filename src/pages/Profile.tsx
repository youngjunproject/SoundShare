import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { SoundCard } from "../components/SoundCard";
import { AudioPlayer } from "../components/AudioPlayer";
import { supabase } from "../lib/supabase";
import {
  Music,
  Users,
  Calendar,
  Instagram,
  Youtube,
  Music2,
  Edit2,
  Check,
  X,
} from "lucide-react";
import type { Sound, Profile as ProfileType } from "../types/sound";

interface EditFormState {
  bio: string;
  instagram_url: string;
  youtube_url: string;
  spotify_url: string;
}

interface SocialLinkProps {
  url?: string;
  icon: React.ElementType;
  platform: string;
}

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
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    bio: "",
    instagram_url: "",
    youtube_url: "",
    spotify_url: "",
  });

  useEffect(() => {
    if (username) {
      loadProfile();
    }
  }, [username]);

  const loadSounds = async (profileId: string) => {
    try {
      const { data, error } = await supabase
        .from("sounds")
        .select(
          `
          *,
          profiles:user_id (username)
        `
        )
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const soundsWithUsername = data.map((sound) => ({
        ...sound,
        username: sound.profiles?.username || "Anonymous",
      }));

      setSounds(soundsWithUsername);
    } catch (err) {
      console.error("Error loading sounds:", err);
      setError("Failed to load sounds");
    }
  };

  const loadProfile = async () => {
    if (!username) return;

    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (profileError) throw profileError;
      if (!profileData) throw new Error("Profile not found");

      setProfile(profileData);
      setIsCurrentUser(profileData.id === user.id);
      setEditForm({
        bio: profileData.bio || "",
        instagram_url: profileData.instagram_url || "",
        youtube_url: profileData.youtube_url || "",
        spotify_url: profileData.spotify_url || "",
      });

      await loadSounds(profileData.id);

      if (profileData.id !== user.id) {
        const { data: followData } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", profileData.id)
          .single();

        setIsFollowing(!!followData);
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profile.id);
      } else {
        await supabase.from("follows").insert([
          {
            follower_id: user.id,
            following_id: profile.id,
          },
        ]);
      }

      setIsFollowing(!isFollowing);
      await loadProfile();
    } catch (error) {
      console.error("Error toggling follow:", error);
      alert("Failed to update follow status");
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          bio: editForm.bio.trim(),
          instagram_url: editForm.instagram_url.trim() || null,
          youtube_url: editForm.youtube_url.trim() || null,
          spotify_url: editForm.spotify_url.trim() || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      setIsEditing(false);
      await loadProfile();
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile");
    }
  };

  const SocialLink: React.FC<SocialLinkProps> = ({
    url,
    icon: Icon,
    platform,
  }) => {
    if (!url) return null;
    return (
      <a
        href={url}
        target='_blank'
        rel='noopener noreferrer'
        className='flex items-center text-gray-600 hover:text-indigo-600 transition-colors'
      >
        <Icon className='h-5 w-5 mr-1' />
        <span className='text-sm'>{platform}</span>
      </a>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className='flex items-center justify-center min-h-[50vh]'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600' />
        </div>
      </Layout>
    );
  }

  if (error || !profile) {
    return (
      <Layout>
        <div className='text-center py-12'>
          <p className='text-red-600'>{error || "Profile not found"}</p>
          <button
            onClick={() => navigate("/")}
            className='mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700'
          >
            Return Home
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='bg-white rounded-lg shadow-lg overflow-hidden'>
          <div className='h-32 bg-gradient-to-r from-indigo-500 to-purple-600' />
          <div className='relative px-6 py-8'>
            {/* Profile Avatar */}
            <div className='absolute -top-12 left-6'>
              <div className='h-24 w-24 rounded-full bg-white p-1'>
                <div
                  className='h-full w-full rounded-full bg-cover bg-center'
                  style={{
                    backgroundImage: profile.avatar_url
                      ? `url(${profile.avatar_url})`
                      : `url(https://ui-avatars.com/api/?name=${profile.username}&background=random)`,
                  }}
                />
              </div>
            </div>

            {/* Profile Content */}
            <div className='ml-32 flex justify-between items-start'>
              <div className='space-y-4 flex-1 max-w-2xl'>
                {/* Username and Bio */}
                <div>
                  <h1 className='text-2xl font-bold text-gray-900'>
                    {profile.username}
                  </h1>
                  {isEditing ? (
                    <textarea
                      value={editForm.bio}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          bio: e.target.value,
                        }))
                      }
                      className='mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
                      rows={3}
                      placeholder='Tell us about yourself...'
                      maxLength={500}
                    />
                  ) : (
                    profile.bio && (
                      <p className='mt-2 text-gray-600'>{profile.bio}</p>
                    )
                  )}
                </div>

                {/* Stats */}
                <div className='flex items-center space-x-6'>
                  <div className='flex items-center'>
                    <Music className='h-4 w-4 mr-1' />
                    <span>{profile.sounds_count} Sounds</span>
                  </div>
                  <div className='flex items-center'>
                    <Users className='h-4 w-4 mr-1' />
                    <span>{profile.followers_count} Followers</span>
                  </div>
                  <div className='flex items-center'>
                    <Calendar className='h-4 w-4 mr-1' />
                    <span>
                      Joined {new Date(profile.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Social Links */}
                {isEditing ? (
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700'>
                        Instagram URL
                      </label>
                      <input
                        type='url'
                        value={editForm.instagram_url}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            instagram_url: e.target.value,
                          }))
                        }
                        className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
                        placeholder='https://instagram.com/username'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700'>
                        YouTube URL
                      </label>
                      <input
                        type='url'
                        value={editForm.youtube_url}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            youtube_url: e.target.value,
                          }))
                        }
                        className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
                        placeholder='https://youtube.com/@channel'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700'>
                        Spotify URL
                      </label>
                      <input
                        type='url'
                        value={editForm.spotify_url}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            spotify_url: e.target.value,
                          }))
                        }
                        className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500'
                        placeholder='https://open.spotify.com/artist/...'
                      />
                    </div>
                  </div>
                ) : (
                  <div className='flex items-center space-x-4'>
                    <SocialLink
                      url={profile.instagram_url}
                      icon={Instagram}
                      platform='Instagram'
                    />
                    <SocialLink
                      url={profile.youtube_url}
                      icon={Youtube}
                      platform='YouTube'
                    />
                    <SocialLink
                      url={profile.spotify_url}
                      icon={Music2}
                      platform='Spotify'
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className='flex items-center space-x-4'>
                {isCurrentUser ? (
                  isEditing ? (
                    <div className='flex space-x-2'>
                      <button
                        onClick={handleSaveProfile}
                        className='flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700'
                      >
                        <Check className='h-4 w-4 mr-2' />
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className='flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200'
                      >
                        <X className='h-4 w-4 mr-2' />
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className='flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200'
                    >
                      <Edit2 className='h-4 w-4 mr-2' />
                      Edit Profile
                    </button>
                  )
                ) : (
                  <button
                    onClick={handleFollow}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isFollowing
                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sounds Grid */}
        <div className='mt-8'>
          <h2 className='text-xl font-bold text-gray-900 mb-6'>Sounds</h2>
          {sounds.length === 0 ? (
            <div className='text-center py-12 bg-white rounded-lg shadow'>
              <p className='text-gray-500'>No sounds uploaded yet</p>
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
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
      </div>
      <AudioPlayer sound={currentSound} />
    </Layout>
  );
}
