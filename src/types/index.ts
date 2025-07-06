import type { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: Timestamp;
}

export interface Activity {
  id: string; // Document ID from Firestore
  userId: string;
  activityName: string;
  activityType: 'Study' | 'Workout' | 'Break';
  durationMinutes: number;
  details: Record<string, any>;
  evidenceUrl?: string;
  status: 'pending' | 'validated' | 'rejected';
  createdAt: Timestamp;
  username?: string; // For client-side join in admin panel
}

export interface Goal {
  id?: string;
  userId: string;
  title: string;
  type: 'daily_duration' | 'weekly_frequency';
  activityCategory: string;
  targetValue: number;
  status: 'active' | 'completed';
  createdAt: Timestamp;
}
