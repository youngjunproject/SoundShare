import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../types/notification';

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:actor_id (username),
          sound:sound_id (title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (data) {
        const formattedNotifications = data.map(notification => ({
          ...notification,
          actor_username: notification.actor?.username || 'Someone',
          sound_title: notification.sound?.title
        }));
        setNotifications(formattedNotifications);
        markAllAsRead();
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.sound_id) {
      navigate(`/sound/${notification.sound_id}`);
    } else if (notification.type === 'follow') {
      navigate(`/profile/${notification.actor_username}`);
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'follow':
        return `${notification.actor_username} followed you`;
      case 'comment':
        return `${notification.actor_username} commented on "${notification.sound_title}"`;
      case 'vote':
        return `${notification.actor_username} liked "${notification.sound_title}"`;
      case 'mention':
        return `${notification.actor_username} mentioned you in a comment`;
      default:
        return 'New notification';
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

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Notifications</h1>

        {error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadNotifications}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="w-full px-6 py-4 hover:bg-gray-50 flex items-start text-left"
              >
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    {getNotificationText(notification)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.created_at).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric'
                    })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}