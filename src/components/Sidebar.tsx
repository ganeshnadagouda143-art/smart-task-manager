import {
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Plus,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import type { NavView, UserProfile } from '../types/task';

interface SidebarProps {
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  onOpenNewTask: () => void;
  onSignOut: () => void;
  user: UserProfile;
  counts: {
    allActive: number;
    myDay: number;
    upcoming: number;
    completed: number;
    overdue: number;
    categories: number;
  };
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavView;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'all', label: 'All Tasks', icon: ListTodo },
  { id: 'my-day', label: 'My Day', icon: Sun },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarDays },
  { id: 'completed', label: 'Completed', icon: CheckCheck },
  { id: 'categories', label: 'Categories', icon: FolderKanban },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  activeView,
  onSelectView,
  onOpenNewTask,
  onSignOut,
  user,
  counts,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const getCountForNav = (id: NavView): number | null => {
    switch (id) {
      case 'all':
        return counts.allActive;
      case 'my-day':
        return counts.myDay;
      case 'upcoming':
        return counts.upcoming;
      case 'completed':
        return counts.completed;
      case 'categories':
        return counts.categories;
      default:
        return null;
    }
  };

  const initials = (user.displayName || user.email || 'U')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-[260px]">
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-7 h-7 rounded-md bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Cadence
          </span>
        </div>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden h-9 w-9 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4">
        <button
          type="button"
          onClick={() => {
            onOpenNewTask();
            onCloseMobile();
          }}
          className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Add Task</span>
        </button>
      </div>

      <nav
        aria-label="Primary navigation"
        className="flex-1 px-3 space-y-1 overflow-y-auto"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const count = getCountForNav(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectView(item.id);
                onCloseMobile();
              }}
              className={`w-full min-h-[40px] px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isActive
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span className="truncate whitespace-nowrap">{item.label}</span>
              </span>

              {count !== null && (
                <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {counts.overdue > 0 && (
          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 px-3">
            <button
              type="button"
              onClick={() => {
                onSelectView('upcoming');
                onCloseMobile();
              }}
              className="w-full text-left py-2 text-xs text-red-600 dark:text-red-400 hover:underline font-medium flex items-center justify-between"
            >
              <span>Overdue tasks</span>
              <span className="font-mono tabular-nums">{counts.overdue}</span>
            </button>
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2.5 p-2 rounded-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={user.displayName || user.email}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {user.displayName || 'Workspace User'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="h-9 w-9 shrink-0 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0 h-screen sticky top-0">
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}
