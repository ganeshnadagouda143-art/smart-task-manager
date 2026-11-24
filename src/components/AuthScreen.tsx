import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import {
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  Repeat,
  Sun,
  Moon,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { auth, googleAuthProvider } from '../lib/firebase';
import type { ThemeMode } from '../types/task';

interface AuthScreenProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export function AuthScreen({ theme, onToggleTheme }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      if (code === 'auth/popup-closed-by-user') {
        setError('Sign-in was canceled before completing.');
      } else if (code === 'auth/popup-blocked') {
        setError(
          'Pop-up was blocked by your browser. Allow pop-ups for this site and try again.'
        );
      } else {
        setError('Unable to complete Google sign-in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="flex items-center justify-between gap-8 px-6 lg:px-12 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-7 h-7 rounded-md bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap">
            Cadence
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <a
            href="#capabilities"
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Capabilities
          </a>
          <a
            href="#workflow"
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Daily Planner
          </a>
          <a
            href="#security"
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Cloud Sync
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={
              theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            }
            className="h-10 w-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <section id="capabilities" className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <p className="text-xs font-medium tracking-wide text-blue-600 dark:text-blue-400">
              Personal &amp; Team Execution Workspace
            </p>
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.12] max-w-xl">
              Organize every priority, deadline, and daily cadence in one place.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              Plan your day, track progress across custom categories, manage
              recurring schedules, and stay ahead of overdue work with real-time
              cloud persistence.
            </p>
          </div>

          <div
            id="workflow"
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <CalendarClock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>My Day &amp; Upcoming Agenda</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Dedicated daily planner with overdue alerts and chronological
                deadline grouping.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Repeat className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Recurring Schedules</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Automatic daily, weekly, and monthly task regeneration the
                moment you check off an item.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <FolderKanban className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Custom Categories &amp; Filters</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Filter across status, priority, category, and deadlines with
                instant bulk actions and undo support.
              </p>
            </div>

            <div id="security" className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Private Account Persistence</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Your tasks, categories, and theme preferences stay synced in
                PostgreSQL across reloads and devices.
              </p>
            </div>
          </div>
        </section>

        <section className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'signin'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                {mode === 'signin'
                  ? 'Welcome back to Cadence'
                  : 'Create your Cadence workspace'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {mode === 'signin'
                  ? 'Sign in with your Google account to access your saved tasks, categories, and daily planner.'
                  : 'Get started in seconds. Your private task database and default categories are provisioned automatically.'}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-60 text-white font-medium text-sm flex items-center justify-center gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                />
              </svg>
              <span className="whitespace-nowrap">
                {isLoading
                  ? 'Connecting...'
                  : mode === 'signin'
                    ? 'Continue with Google'
                    : 'Sign Up with Google'}
              </span>
              {!isLoading && <ArrowRight className="w-4 h-4 shrink-0" />}
            </button>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-800">
              Each account maintains isolated tasks, custom categories, and
              notification settings stored securely on the server.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
