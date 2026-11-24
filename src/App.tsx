import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  AlertCircle,
  Bell,
  Menu,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  X,
} from 'lucide-react';
import { auth } from './lib/firebase';
import {
  bulkTasksApi,
  createCategoryApi,
  createTaskApi,
  deleteCategoryApi,
  deleteTaskApi,
  fetchTasks,
  restoreTasksApi,
  seedSampleTasksApi,
  syncAccount,
  updatePreferencesApi,
  updateTaskApi,
} from './lib/api';
import {
  getDueReminders,
  getTodayStr,
  isTaskDueToday,
  isTaskOverdue,
  type TaskFilterCriteria,
} from './lib/taskUtils';
import type {
  CategoryRecord,
  NavView,
  SortOption,
  TaskFormPayload,
  TaskPriority,
  TaskRecord,
  TaskStatus,
  ThemeMode,
  UserProfile,
} from './types/task';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TaskListView } from './components/TaskListView';
import { CategoriesView } from './components/CategoriesView';
import { SettingsView } from './components/SettingsView';
import { TaskFormModal } from './components/TaskFormModal';
import { ConfirmModal } from './components/ConfirmModal';

const VIEW_HEADERS: Record<NavView, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Overview of your tasks, completion pace, and upcoming deadlines.',
  },
  all: {
    title: 'All Tasks',
    subtitle: 'Search, filter, sort, and manage every task in your workspace.',
  },
  'my-day': {
    title: 'My Day',
    subtitle: 'Focused daily planner for today’s priorities and pinned tasks.',
  },
  upcoming: {
    title: 'Upcoming',
    subtitle: 'Chronological timeline of overdue and upcoming scheduled tasks.',
  },
  completed: {
    title: 'Completed',
    subtitle: 'Archive of finished tasks ready to review or restore.',
  },
  categories: {
    title: 'Categories',
    subtitle: 'Predefined and custom categories with completion progress.',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Customize theme, reminders, sorting defaults, and account access.',
  },
};

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem('cadence_theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    undoTasks?: TaskRecord[];
  } | null>(null);

  const [activeView, setActiveView] = useState<NavView>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);

  const [filters, setFilters] = useState<TaskFilterCriteria>({
    search: '',
    status: 'All',
    priority: 'All',
    category: 'All',
    dueFilter: 'All',
    customDate: '',
    sortBy: 'newest',
  });

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [confirmState, setConfirmState] = useState<{
    type: 'delete-task' | 'bulk-delete' | 'delete-category';
    task?: TaskRecord;
    ids?: string[];
    category?: CategoryRecord;
  } | null>(null);
  const [isConfirmBusy, setIsConfirmBusy] = useState(false);

  const [dismissedReminderIds, setDismissedReminderIds] = useState<string[]>(
    []
  );
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('cadence_theme', theme);
  }, [theme]);

  const showToast = useCallback(
    (message: string, undoTasks?: TaskRecord[]) => {
      const id = Date.now();
      setToast({ id, message, undoTasks });
    },
    []
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast((prev) => (prev?.id === toast.id ? null : prev));
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadWorkspace = useCallback(async () => {
    setIsLoadingWorkspace(true);
    setWorkspaceError(null);
    try {
      const [syncRes, tasksRes] = await Promise.all([
        syncAccount(),
        fetchTasks(),
      ]);
      setUserProfile(syncRes.user);
      setCategories(syncRes.categories);
      setTasks(tasksRes.tasks);
      if (syncRes.user.theme === 'dark' || syncRes.user.theme === 'light') {
        setTheme(syncRes.user.theme);
      }
      setFilters((prev) => ({
        ...prev,
        sortBy: syncRes.user.defaultSort || 'newest',
      }));
    } catch (err: unknown) {
      setWorkspaceError(
        err instanceof Error
          ? err.message
          : 'Failed to load workspace data. Please refresh.'
      );
    } finally {
      setIsLoadingWorkspace(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (user) {
        loadWorkspace();
      } else {
        setUserProfile(null);
        setTasks([]);
        setCategories([]);
        setSelectedIds([]);
      }
    });
    return () => unsub();
  }, [loadWorkspace]);

  const activeReminders = useMemo(() => {
    return getDueReminders(tasks).filter(
      (t) => !dismissedReminderIds.includes(t.id)
    );
  }, [tasks, dismissedReminderIds]);

  useEffect(() => {
    if (
      !userProfile?.notificationsEnabled ||
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    ) {
      return;
    }

    for (const task of activeReminders) {
      if (!notifiedIdsRef.current.has(task.id)) {
        notifiedIdsRef.current.add(task.id);
        new Notification(`Task Reminder: ${task.title}`, {
          body: `${task.category} · ${task.priority} Priority`,
        });
      }
    }
  }, [activeReminders, userProfile?.notificationsEnabled]);

  const handleToggleTheme = async (explicit?: ThemeMode) => {
    const nextTheme: ThemeMode =
      explicit ?? (theme === 'dark' ? 'light' : 'dark');
    setTheme(nextTheme);
    if (userProfile) {
      setUserProfile({ ...userProfile, theme: nextTheme });
      try {
        await updatePreferencesApi({ theme: nextTheme });
      } catch {
        // Local theme already applied; server sync failure is non-fatal
      }
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setActiveView('dashboard');
  };

  const handleSaveTask = async (
    payload: TaskFormPayload,
    editingId?: string
  ) => {
    if (editingId) {
      const res = await updateTaskApi(editingId, payload);
      setTasks((prev) => {
        const replaced = prev.map((t) =>
          t.id === editingId ? res.task : t
        );
        return res.nextOccurrence
          ? [res.nextOccurrence, ...replaced]
          : replaced;
      });
      showToast(
        res.nextOccurrence
          ? 'Task completed and next recurring occurrence scheduled.'
          : 'Task updated.'
      );
    } else {
      const res = await createTaskApi(payload);
      setTasks((prev) => [res.task, ...prev]);
      showToast('Task created.');
    }
  };

  const handleToggleComplete = async (task: TaskRecord) => {
    const nextStatus: TaskStatus =
      task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      const res = await updateTaskApi(task.id, { status: nextStatus });
      setTasks((prev) => {
        const updatedList = prev.map((t) =>
          t.id === task.id ? res.task : t
        );
        return res.nextOccurrence
          ? [res.nextOccurrence, ...updatedList]
          : updatedList;
      });
      if (res.nextOccurrence) {
        showToast(
          `Completed "${task.title}" and scheduled next ${task.recurrence.toLowerCase()} occurrence.`
        );
      } else {
        showToast(
          nextStatus === 'Completed'
            ? `Completed "${task.title}".`
            : `Restored "${task.title}" to pending.`
        );
      }
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Unable to update task status.'
      );
    }
  };

  const handleChangeStatus = async (task: TaskRecord, status: TaskStatus) => {
    if (task.status === status) return;
    try {
      const res = await updateTaskApi(task.id, { status });
      setTasks((prev) => {
        const updatedList = prev.map((t) =>
          t.id === task.id ? res.task : t
        );
        return res.nextOccurrence
          ? [res.nextOccurrence, ...updatedList]
          : updatedList;
      });
      if (res.nextOccurrence) {
        showToast(
          `Completed "${task.title}" and scheduled next occurrence.`
        );
      }
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Unable to update status.'
      );
    }
  };

  const handleToggleMyDay = async (task: TaskRecord) => {
    try {
      const res = await updateTaskApi(task.id, { isMyDay: !task.isMyDay });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res.task : t)));
      showToast(
        res.task.isMyDay ? 'Added to My Day.' : 'Removed from My Day.'
      );
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Unable to update My Day.'
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmState) return;
    setIsConfirmBusy(true);
    try {
      if (confirmState.type === 'delete-task' && confirmState.task) {
        const target = confirmState.task;
        const res = await deleteTaskApi(target.id);
        setTasks((prev) => prev.filter((t) => t.id !== target.id));
        setSelectedIds((prev) => prev.filter((id) => id !== target.id));
        showToast(`Deleted "${target.title}".`, [res.deleted]);
      } else if (
        confirmState.type === 'bulk-delete' &&
        confirmState.ids &&
        confirmState.ids.length > 0
      ) {
        const ids = confirmState.ids;
        const res = await bulkTasksApi(ids, 'delete');
        setTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
        setSelectedIds([]);
        showToast(
          `Deleted ${res.deleted.length} ${
            res.deleted.length === 1 ? 'task' : 'tasks'
          }.`,
          res.deleted
        );
      } else if (
        confirmState.type === 'delete-category' &&
        confirmState.category
      ) {
        const cat = confirmState.category;
        await deleteCategoryApi(cat.id);
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
        setTasks((prev) =>
          prev.map((t) =>
            t.category === cat.name ? { ...t, category: 'Other' } : t
          )
        );
        showToast(`Deleted category "${cat.name}". Reassigned tasks to Other.`);
      }
      setConfirmState(null);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Delete operation failed.'
      );
    } finally {
      setIsConfirmBusy(false);
    }
  };

  const handleUndoDelete = async (tasksToRestore: TaskRecord[]) => {
    try {
      const res = await restoreTasksApi(tasksToRestore);
      setTasks((prev) => [...res.tasks, ...prev]);
      setToast(null);
      showToast(
        `Restored ${res.tasks.length} ${
          res.tasks.length === 1 ? 'task' : 'tasks'
        }.`
      );
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Could not restore deleted tasks.'
      );
    }
  };

  const handleBulkComplete = async (ids: string[]) => {
    try {
      const res = await bulkTasksApi(ids, 'complete');
      const updatedMap = new Map(res.updated.map((t) => [t.id, t]));
      setTasks((prev) => [
        ...res.spawned,
        ...prev.map((t) => updatedMap.get(t.id) ?? t),
      ]);
      setSelectedIds([]);
      showToast(`Completed ${res.updated.length} selected tasks.`);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Bulk completion failed.'
      );
    }
  };

  const handleBulkIncomplete = async (ids: string[]) => {
    try {
      const res = await bulkTasksApi(ids, 'incomplete');
      const updatedMap = new Map(res.updated.map((t) => [t.id, t]));
      setTasks((prev) => prev.map((t) => updatedMap.get(t.id) ?? t));
      setSelectedIds([]);
      showToast(`Moved ${res.updated.length} tasks back to Pending.`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Bulk update failed.');
    }
  };

  const handleRescheduleOverdueToToday = async () => {
    const overdue = tasks.filter((t) => isTaskOverdue(t));
    if (overdue.length === 0) return;
    const todayStr = getTodayStr();
    try {
      const results = await Promise.all(
        overdue.map((t) =>
          updateTaskApi(t.id, { dueDate: todayStr, isMyDay: true })
        )
      );
      const updatedMap = new Map(results.map((r) => [r.task.id, r.task]));
      setTasks((prev) => prev.map((t) => updatedMap.get(t.id) ?? t));
      showToast(
        `Rescheduled ${results.length} overdue ${
          results.length === 1 ? 'task' : 'tasks'
        } to today.`
      );
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Unable to reschedule tasks.'
      );
    }
  };

  const handleSeedSampleTasks = async () => {
    setIsSeeding(true);
    try {
      const res = await seedSampleTasksApi();
      setTasks((prev) => [...res.tasks, ...prev]);
      showToast('Sample workspace tasks added.');
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Failed to load sample tasks.'
      );
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCreateCategory = async (name: string, color: string) => {
    const res = await createCategoryApi(name, color);
    setCategories((prev) => [...prev, res.category]);
    showToast(`Created category "${res.category.name}".`);
  };

  const handleUpdateDefaultSort = async (sort: SortOption) => {
    setFilters((prev) => ({ ...prev, sortBy: sort }));
    if (userProfile) {
      setUserProfile({ ...userProfile, defaultSort: sort });
    }
    try {
      await updatePreferencesApi({ defaultSort: sort });
      showToast('Default sort order saved.');
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Failed to save sort preference.'
      );
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (userProfile) {
      setUserProfile({ ...userProfile, notificationsEnabled: enabled });
    }
    try {
      await updatePreferencesApi({ notificationsEnabled: enabled });
      showToast(enabled ? 'Task reminders enabled.' : 'Task reminders muted.');
    } catch (err: unknown) {
      showToast(
        err instanceof Error
          ? err.message
          : 'Failed to save notification preference.'
      );
    }
  };

  const handleNavigateWithFilter = (
    view: NavView,
    preset?: {
      status?: 'All' | TaskStatus;
      priority?: 'All' | TaskPriority;
      category?: string;
      dueFilter?: 'All' | 'Today' | 'Week' | 'Overdue' | 'NoDate';
    }
  ) => {
    setSelectedIds([]);
    setActiveView(view);
    if (preset) {
      setFilters((prev) => ({
        ...prev,
        search: '',
        status: preset.status ?? 'All',
        priority: preset.priority ?? 'All',
        category: preset.category ?? 'All',
        dueFilter: preset.dueFilter ?? 'All',
        customDate: '',
      }));
    }
  };

  const handleSelectView = (view: NavView) => {
    setSelectedIds([]);
    setActiveView(view);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      status: 'All',
      priority: 'All',
      category: 'All',
      dueFilter: 'All',
      customDate: '',
      sortBy: userProfile?.defaultSort ?? 'newest',
    });
  };

  const counts = useMemo(
    () => ({
      allActive: tasks.filter((t) => t.status !== 'Completed').length,
      myDay: tasks.filter(
        (t) =>
          t.status !== 'Completed' && (t.isMyDay || isTaskDueToday(t))
      ).length,
      upcoming: tasks.filter((t) => t.status !== 'Completed').length,
      completed: tasks.filter((t) => t.status === 'Completed').length,
      overdue: tasks.filter((t) => isTaskOverdue(t)).length,
      categories: categories.length,
    }),
    [tasks, categories]
  );

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-sm">
        Loading workspace...
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <AuthScreen theme={theme} onToggleTheme={() => handleToggleTheme()} />
    );
  }

  const effectiveUser: UserProfile = userProfile ?? {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    displayName: firebaseUser.displayName ?? '',
    photoUrl: firebaseUser.photoURL ?? '',
    theme,
    defaultSort: 'newest',
    notificationsEnabled: false,
  };

  const headerInfo = VIEW_HEADERS[activeView];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar
        activeView={activeView}
        onSelectView={handleSelectView}
        onOpenNewTask={() => {
          setEditingTask(null);
          setTaskModalOpen(true);
        }}
        onSignOut={handleSignOut}
        user={effectiveUser}
        counts={counts}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden h-10 w-10 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  {headerInfo.title}
                </h1>
                <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 truncate">
                  {headerInfo.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => handleToggleTheme()}
                aria-label={
                  theme === 'dark'
                    ? 'Switch to light theme'
                    : 'Switch to dark theme'
                }
                title={
                  theme === 'dark'
                    ? 'Switch to light theme'
                    : 'Switch to dark theme'
                }
                className="h-10 w-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setTaskModalOpen(true);
                }}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <Plus className="w-4 h-4" />
                <span>New Task</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-6">
          <div className="max-w-6xl mx-auto space-y-5">
            {workspaceError && (
              <div
                role="alert"
                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300"
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{workspaceError}</span>
                </div>
                <button
                  type="button"
                  onClick={loadWorkspace}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium whitespace-nowrap"
                >
                  Retry
                </button>
              </div>
            )}

            {activeReminders.length > 0 && (
              <div
                role="region"
                aria-label="Active task reminders"
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30"
              >
                <div className="flex items-start gap-3">
                  <Bell className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900 dark:text-amber-200">
                    <span className="font-semibold">
                      Reminder ({activeReminders.length}):
                    </span>{' '}
                    <span>
                      {activeReminders
                        .slice(0, 2)
                        .map((t) => t.title)
                        .join(', ')}
                      {activeReminders.length > 2
                        ? ` and ${activeReminders.length - 2} more`
                        : ''}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDismissedReminderIds((prev) => [
                      ...prev,
                      ...activeReminders.map((t) => t.id),
                    ])
                  }
                  className="text-xs font-medium text-amber-800 dark:text-amber-300 hover:underline self-end sm:self-center whitespace-nowrap"
                >
                  Dismiss
                </button>
              </div>
            )}

            {isLoadingWorkspace ? (
              <div className="space-y-4" aria-busy="true">
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
                    />
                  ))}
                </div>
                <div className="h-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
              </div>
            ) : activeView === 'dashboard' ? (
              <DashboardView
                tasks={tasks}
                categories={categories}
                onNavigateWithFilter={handleNavigateWithFilter}
                onOpenNewTask={() => {
                  setEditingTask(null);
                  setTaskModalOpen(true);
                }}
                onToggleComplete={handleToggleComplete}
                onEditTask={(task) => {
                  setEditingTask(task);
                  setTaskModalOpen(true);
                }}
                onRescheduleOverdueToToday={handleRescheduleOverdueToToday}
                onSeedSampleTasks={handleSeedSampleTasks}
                isSeeding={isSeeding}
              />
            ) : activeView === 'categories' ? (
              <CategoriesView
                categories={categories}
                tasks={tasks}
                onCreateCategory={handleCreateCategory}
                onDeleteCategory={(category) =>
                  setConfirmState({ type: 'delete-category', category })
                }
                onOpenCategoryTasks={(categoryName) =>
                  handleNavigateWithFilter('all', {
                    category: categoryName,
                    status: 'All',
                  })
                }
              />
            ) : activeView === 'settings' ? (
              <SettingsView
                user={effectiveUser}
                theme={theme}
                onChangeTheme={(next) => handleToggleTheme(next)}
                onUpdateDefaultSort={handleUpdateDefaultSort}
                onToggleNotifications={handleToggleNotifications}
                onSeedSampleTasks={handleSeedSampleTasks}
                onSignOut={handleSignOut}
                isSeeding={isSeeding}
              />
            ) : (
              <TaskListView
                mode={activeView}
                tasks={tasks}
                categories={categories}
                filters={filters}
                onChangeFilters={setFilters}
                onResetFilters={resetFilters}
                selectedIds={selectedIds}
                onToggleSelect={(id) =>
                  setSelectedIds((prev) =>
                    prev.includes(id)
                      ? prev.filter((item) => item !== id)
                      : [...prev, id]
                  )
                }
                onSelectMany={(ids) => setSelectedIds(ids)}
                onClearSelection={() => setSelectedIds([])}
                onQuickCreate={(payload) => handleSaveTask(payload)}
                onOpenNewTask={() => {
                  setEditingTask(null);
                  setTaskModalOpen(true);
                }}
                onToggleComplete={handleToggleComplete}
                onChangeStatus={handleChangeStatus}
                onToggleMyDay={handleToggleMyDay}
                onEditTask={(task) => {
                  setEditingTask(task);
                  setTaskModalOpen(true);
                }}
                onDeleteTask={(task) =>
                  setConfirmState({ type: 'delete-task', task })
                }
                onBulkComplete={handleBulkComplete}
                onBulkIncomplete={handleBulkIncomplete}
                onBulkDelete={(ids) =>
                  setConfirmState({ type: 'bulk-delete', ids })
                }
              />
            )}
          </div>
        </main>
      </div>

      <TaskFormModal
        isOpen={taskModalOpen}
        editingTask={editingTask}
        categories={categories}
        defaultMyDay={activeView === 'my-day'}
        defaultCategory={
          filters.category !== 'All' ? filters.category : 'Personal'
        }
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSaveTask}
      />

      <ConfirmModal
        isOpen={Boolean(confirmState)}
        title={
          confirmState?.type === 'delete-category'
            ? `Delete "${confirmState.category?.name}"?`
            : confirmState?.type === 'bulk-delete'
              ? `Delete ${confirmState.ids?.length ?? 0} selected tasks?`
              : `Delete "${confirmState?.task?.title}"?`
        }
        description={
          confirmState?.type === 'delete-category'
            ? 'Tasks currently assigned to this category will be moved to Other.'
            : 'You can undo this action immediately from the notification banner after deleting.'
        }
        confirmLabel="Delete"
        isBusy={isConfirmBusy}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!isConfirmBusy) setConfirmState(null);
        }}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-md bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center justify-between gap-4"
        >
          <span className="text-sm">{toast.message}</span>
          <div className="flex items-center gap-2 shrink-0">
            {toast.undoTasks && toast.undoTasks.length > 0 && (
              <button
                type="button"
                onClick={() => handleUndoDelete(toast.undoTasks!)}
                className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
