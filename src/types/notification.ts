export type NotificationType = 'follow' | 'comment' | 'vote' | 'mention';

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: NotificationType;
  content: string;
  read: boolean;
  created_at: string;
}