import type {
  SortOption,
  TaskPriority,
  TaskRecord,
  TaskStatus,
} from '../types/task';

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayStr(): string {
  return formatLocalDate(new Date());
}

export function getTomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatLocalDate(d);
}

export function getEndOfWeekStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return formatLocalDate(d);
}

export function isTaskOverdue(task: TaskRecord): boolean {
  if (task.status === 'Completed' || !task.dueDate) return false;
  const now = new Date();
  const todayStr = formatLocalDate(now);
  if (task.dueDate < todayStr) return true;
  if (task.dueDate === todayStr && task.dueTime) {
    const [hours, mins] = task.dueTime.split(':').map(Number);
    const dueDateTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      mins,
      0
    );
    return dueDateTime.getTime() < now.getTime();
  }
  return false;
}

export function isTaskDueToday(task: TaskRecord): boolean {
  return task.dueDate === getTodayStr();
}

export function formatFriendlyDate(
  dateStr: string | null,
  timeStr: string | null
): string {
  if (!dateStr) return 'No deadline';
  const todayStr = getTodayStr();
  const tomorrowStr = getTomorrowStr();

  let dateLabel: string;
  if (dateStr === todayStr) {
    dateLabel = 'Today';
  } else if (dateStr === tomorrowStr) {
    dateLabel = 'Tomorrow';
  } else {
    const parsed = new Date(`${dateStr}T00:00:00`);
    dateLabel = parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year:
        parsed.getFullYear() !== new Date().getFullYear()
          ? 'numeric'
          : undefined,
    });
  }

  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    const formattedTime = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${dateLabel} at ${formattedTime}`;
  }
  return dateLabel;
}

export function formatShortTimestamp(isoStr: string | null): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

export interface TaskFilterCriteria {
  search: string;
  status: 'All' | TaskStatus;
  priority: 'All' | TaskPriority;
  category: string;
  dueFilter: 'All' | 'Today' | 'Week' | 'Overdue' | 'NoDate' | 'CustomDate';
  customDate: string;
  sortBy: SortOption;
}

export function filterAndSortTasks(
  tasks: TaskRecord[],
  criteria: TaskFilterCriteria
): TaskRecord[] {
  const q = criteria.search.trim().toLowerCase();
  const todayStr = getTodayStr();
  const weekEndStr = getEndOfWeekStr();

  const filtered = tasks.filter((task) => {
    if (q) {
      const hay = `${task.title} ${task.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    if (criteria.status !== 'All' && task.status !== criteria.status) {
      return false;
    }

    if (criteria.priority !== 'All' && task.priority !== criteria.priority) {
      return false;
    }

    if (criteria.category !== 'All' && task.category !== criteria.category) {
      return false;
    }

    if (criteria.dueFilter === 'Today') {
      if (task.dueDate !== todayStr) return false;
    } else if (criteria.dueFilter === 'Week') {
      if (!task.dueDate || task.dueDate < todayStr || task.dueDate > weekEndStr) {
        return false;
      }
    } else if (criteria.dueFilter === 'Overdue') {
      if (!isTaskOverdue(task)) return false;
    } else if (criteria.dueFilter === 'NoDate') {
      if (task.dueDate !== null) return false;
    } else if (criteria.dueFilter === 'CustomDate' && criteria.customDate) {
      if (task.dueDate !== criteria.customDate) return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    if (criteria.sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (criteria.sortBy === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (criteria.sortBy === 'priority') {
      const diff = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (criteria.sortBy === 'deadline') {
      if (!a.dueDate && !b.dueDate) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      const aKey = `${a.dueDate}T${a.dueTime ?? '23:59'}`;
      const bKey = `${b.dueDate}T${b.dueTime ?? '23:59'}`;
      return aKey.localeCompare(bKey);
    }
    return 0;
  });
}

export interface DashboardMetrics {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  overdue: number;
  completionPct: number;
  highPriorityPending: number;
  dueTodayCount: number;
}

export function computeDashboardStats(tasks: TaskRecord[]): DashboardMetrics {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const pending = tasks.filter((t) => t.status === 'Pending').length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const overdue = tasks.filter((t) => isTaskOverdue(t)).length;
  const completionPct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const highPriorityPending = tasks.filter(
    (t) => t.status !== 'Completed' && t.priority === 'High'
  ).length;
  const dueTodayCount = tasks.filter(
    (t) => t.status !== 'Completed' && isTaskDueToday(t)
  ).length;

  return {
    total,
    completed,
    pending,
    inProgress,
    overdue,
    completionPct,
    highPriorityPending,
    dueTodayCount,
  };
}

export function getDueReminders(tasks: TaskRecord[]): TaskRecord[] {
  const now = new Date();
  const todayStr = formatLocalDate(now);

  return tasks.filter((task) => {
    if (task.status === 'Completed' || !task.reminderEnabled || !task.dueDate) {
      return false;
    }
    if (task.dueDate < todayStr) return true;
    if (task.dueDate > todayStr) return false;

    if (!task.dueTime) return true;
    const [h, m] = task.dueTime.split(':').map(Number);
    const dueMs = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      h,
      m,
      0
    ).getTime();
    const triggerMs = dueMs - task.reminderMinutesBefore * 60 * 1000;
    return now.getTime() >= triggerMs;
  });
}
