import { auth } from './firebase';
import type {
  CategoryRecord,
  SortOption,
  TaskFormPayload,
  TaskRecord,
  ThemeMode,
  UserProfile,
} from '../types/task';

async function getAuthHeaders(): Promise<HeadersInit> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required. Please sign in again.');
  }
  const token = await currentUser.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data?.error === 'string'
        ? data.error
        : 'Request failed. Please try again.';
    throw new Error(message);
  }
  return data as T;
}

export async function syncAccount(): Promise<{
  user: UserProfile;
  categories: CategoryRecord[];
}> {
  return apiRequest('/api/auth/sync', { method: 'POST' });
}

export async function fetchTasks(): Promise<{ tasks: TaskRecord[] }> {
  return apiRequest('/api/tasks');
}

export async function createTaskApi(
  payload: TaskFormPayload
): Promise<{ task: TaskRecord }> {
  return apiRequest('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTaskApi(
  id: string,
  updates: Partial<TaskFormPayload>
): Promise<{ task: TaskRecord; nextOccurrence: TaskRecord | null }> {
  return apiRequest(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteTaskApi(
  id: string
): Promise<{ deleted: TaskRecord }> {
  return apiRequest(`/api/tasks/${id}`, {
    method: 'DELETE',
  });
}

export async function restoreTasksApi(
  tasks: TaskRecord[]
): Promise<{ tasks: TaskRecord[] }> {
  return apiRequest('/api/tasks/restore', {
    method: 'POST',
    body: JSON.stringify({ tasks }),
  });
}

export async function bulkTasksApi(
  ids: string[],
  action: 'complete' | 'incomplete' | 'delete'
): Promise<{
  updated: TaskRecord[];
  deleted: TaskRecord[];
  spawned: TaskRecord[];
}> {
  return apiRequest('/api/tasks/bulk', {
    method: 'POST',
    body: JSON.stringify({ ids, action }),
  });
}

export async function seedSampleTasksApi(): Promise<{ tasks: TaskRecord[] }> {
  return apiRequest('/api/tasks/seed-sample', { method: 'POST' });
}

export async function fetchCategories(): Promise<{
  categories: CategoryRecord[];
}> {
  return apiRequest('/api/categories');
}

export async function createCategoryApi(
  name: string,
  color: string
): Promise<{ category: CategoryRecord }> {
  return apiRequest('/api/categories', {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  });
}

export async function deleteCategoryApi(
  id: string
): Promise<{ deletedName: string }> {
  return apiRequest(`/api/categories/${id}`, {
    method: 'DELETE',
  });
}

export async function updatePreferencesApi(prefs: {
  theme?: ThemeMode;
  defaultSort?: SortOption;
  notificationsEnabled?: boolean;
}): Promise<{ user: UserProfile }> {
  return apiRequest('/api/user/preferences', {
    method: 'PATCH',
    body: JSON.stringify(prefs),
  });
}
