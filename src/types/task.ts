export type TaskPriority = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
export type TaskRecurrence = 'None' | 'Daily' | 'Weekly' | 'Monthly';
export type NavView =
  | 'dashboard'
  | 'all'
  | 'my-day'
  | 'upcoming'
  | 'completed'
  | 'categories'
  | 'settings';
export type SortOption = 'newest' | 'oldest' | 'priority' | 'deadline';
export type ThemeMode = 'light' | 'dark';

export interface TaskRecord {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  dueTime: string | null;
  recurrence: TaskRecurrence;
  isMyDay: boolean;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRecord {
  id: string;
  userId: string;
  name: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string;
  theme: ThemeMode;
  defaultSort: SortOption;
  notificationsEnabled: boolean;
}

export interface TaskFormPayload {
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  dueTime: string | null;
  recurrence: TaskRecurrence;
  isMyDay: boolean;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
}
