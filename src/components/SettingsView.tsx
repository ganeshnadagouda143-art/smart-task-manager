import { useState } from 'react';
import { Bell, LogOut, Moon, Sparkles, Sun } from 'lucide-react';
import type { SortOption, ThemeMode, UserProfile } from '../types/task';

interface SettingsViewProps {
  user: UserProfile;
  theme: ThemeMode;
  onChangeTheme: (theme: ThemeMode) => void;
  onUpdateDefaultSort: (sort: SortOption) => Promise<void>;
  onToggleNotifications: (enabled: boolean) => Promise<void>;
  onSeedSampleTasks: () => Promise<void>;
  onSignOut: () => void;
  isSeeding: boolean;
}

export function SettingsView({
  user,
  theme,
  onChangeTheme,
  onUpdateDefaultSort,
  onToggleNotifications,
  onSeedSampleTasks,
  onSignOut,
  isSeeding,
}: SettingsViewProps) {
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);
  const [sampleFeedback, setSampleFeedback] = useState<string | null>(null);

  const handleToggleNotif = async () => {
    setNotifFeedback(null);
    const next = !user.notificationsEnabled;
    if (next && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          setNotifFeedback(
            'Browser notifications were not granted. In-app reminder banners remain active.'
          );
        }
      } else if (Notification.permission === 'denied') {
        setNotifFeedback(
          'Browser notifications are blocked in browser settings. In-app reminder banners remain active.'
        );
      }
    }
    await onToggleNotifications(next);
  };

  const handleSeed = async () => {
    setSampleFeedback(null);
    await onSeedSampleTasks();
    setSampleFeedback('Sample tasks have been added to your workspace.');
  };

  return (
    <div className="max-w-3xl space-y-6">
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Account Profile
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-3.5">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={user.displayName || user.email}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {user.displayName || 'Workspace User'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Appearance &amp; Defaults
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Customize your workspace theme and default sorting preference.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Theme Mode
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Switch between crisp light surfaces and dark slate mode.
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => onChangeTheme('light')}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                theme === 'light'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeTheme('dark')}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                theme === 'dark'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label
              htmlFor="default-sort-select"
              className="text-sm font-medium text-slate-900 dark:text-white block"
            >
              Default Task Sort Order
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Applied when loading All Tasks and My Day views.
            </p>
          </div>

          <select
            id="default-sort-select"
            value={user.defaultSort}
            onChange={(e) => onUpdateDefaultSort(e.target.value as SortOption)}
            className="min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority">Highest Priority First</option>
            <option value="deadline">Earliest Deadline First</option>
          </select>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-400" />
                <span>Task Reminders &amp; Alerts</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Receive desktop notifications and reminder banners for scheduled
                tasks.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={user.notificationsEnabled}
              onClick={handleToggleNotif}
              className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                user.notificationsEnabled
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {user.notificationsEnabled ? 'Enabled' : 'Enable Alerts'}
            </button>
          </div>

          {notifFeedback && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {notifFeedback}
            </p>
          )}
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Starter Workspace Data
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add a curated set of sample tasks across categories and recurrence
              rules.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSeed}
            disabled={isSeeding}
            className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isSeeding ? 'Adding...' : 'Add Sample Tasks'}</span>
          </button>
        </div>

        {sampleFeedback && (
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            {sampleFeedback}
          </p>
        )}
      </section>
    </div>
  );
}
