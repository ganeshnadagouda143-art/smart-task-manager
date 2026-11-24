import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  ListChecks,
  Plus,
  Sparkles,
} from 'lucide-react';
import {
  computeDashboardStats,
  formatFriendlyDate,
  isTaskDueToday,
  isTaskOverdue,
} from '../lib/taskUtils';
import type {
  CategoryRecord,
  NavView,
  TaskPriority,
  TaskRecord,
  TaskStatus,
} from '../types/task';

interface DashboardViewProps {
  tasks: TaskRecord[];
  categories: CategoryRecord[];
  onNavigateWithFilter: (
    view: NavView,
    preset?: {
      status?: 'All' | TaskStatus;
      priority?: 'All' | TaskPriority;
      category?: string;
      dueFilter?: 'All' | 'Today' | 'Week' | 'Overdue' | 'NoDate';
    }
  ) => void;
  onOpenNewTask: () => void;
  onToggleComplete: (task: TaskRecord) => void;
  onEditTask: (task: TaskRecord) => void;
  onRescheduleOverdueToToday: () => Promise<void>;
  onSeedSampleTasks: () => Promise<void>;
  isSeeding: boolean;
}

export function DashboardView({
  tasks,
  categories,
  onNavigateWithFilter,
  onOpenNewTask,
  onToggleComplete,
  onEditTask,
  onRescheduleOverdueToToday,
  onSeedSampleTasks,
  isSeeding,
}: DashboardViewProps) {
  const stats = computeDashboardStats(tasks);
  const overdueTasks = tasks.filter((t) => isTaskOverdue(t));
  const todayTasks = tasks.filter(
    (t) => t.status !== 'Completed' && (t.isMyDay || isTaskDueToday(t))
  );
  const upcomingTasks = tasks
    .filter((t) => t.status !== 'Completed' && t.dueDate && !isTaskOverdue(t))
    .sort((a, b) =>
      `${a.dueDate}T${a.dueTime ?? '23:59'}`.localeCompare(
        `${b.dueDate}T${b.dueTime ?? '23:59'}`
      )
    )
    .slice(0, 5);

  const categoryMap = new Map(categories.map((c) => [c.name, c.color]));

  const priorityCounts: Array<{
    label: TaskPriority;
    count: number;
    barClass: string;
  }> = [
    {
      label: 'High',
      count: tasks.filter(
        (t) => t.status !== 'Completed' && t.priority === 'High'
      ).length,
      barClass: 'bg-red-600 dark:bg-red-500',
    },
    {
      label: 'Medium',
      count: tasks.filter(
        (t) => t.status !== 'Completed' && t.priority === 'Medium'
      ).length,
      barClass: 'bg-amber-500 dark:bg-amber-400',
    },
    {
      label: 'Low',
      count: tasks.filter(
        (t) => t.status !== 'Completed' && t.priority === 'Low'
      ).length,
      barClass: 'bg-slate-400 dark:bg-slate-500',
    },
  ];
  const activeTotal = Math.max(1, stats.pending + stats.inProgress);

  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference - (stats.completionPct / 100) * ringCircumference;

  if (tasks.length === 0) {
    return (
      <div className="space-y-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 sm:p-12 text-center max-w-2xl mx-auto mt-6 space-y-5">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center mx-auto">
            <ListChecks className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Your workspace is ready
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Create your first task to start tracking deadlines, priorities, and
              daily focus—or load a sample workspace to explore all features.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenNewTask}
              className="min-h-[42px] px-5 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Task</span>
            </button>
            <button
              type="button"
              onClick={onSeedSampleTasks}
              disabled={isSeeding}
              className="min-h-[42px] px-5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isSeeding ? 'Loading Sample Tasks...' : 'Load Sample Tasks'}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {overdueTasks.length > 0 && (
        <div
          role="region"
          aria-label="Overdue tasks alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                <span className="font-mono tabular-nums">
                  {overdueTasks.length}
                </span>{' '}
                {overdueTasks.length === 1 ? 'task is' : 'tasks are'} past due
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                Review overdue items or reschedule all past-due deadlines to
                today.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRescheduleOverdueToToday}
              className="min-h-[36px] px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-slate-900 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50 text-xs font-medium transition-colors whitespace-nowrap"
            >
              Reschedule to Today
            </button>
            <button
              type="button"
              onClick={() =>
                onNavigateWithFilter('all', {
                  status: 'All',
                  dueFilter: 'Overdue',
                })
              }
              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors whitespace-nowrap"
            >
              View Overdue
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <button
          type="button"
          onClick={() => onNavigateWithFilter('all', { status: 'All' })}
          className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Tasks
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-2">
            {stats.total}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateWithFilter('completed')}
          className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Completed
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.completed}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateWithFilter('all', { status: 'Pending' })}
          className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Pending
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-2">
            {stats.pending}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateWithFilter('all', { status: 'In Progress' })}
          className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            In Progress
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400 mt-2">
            {stats.inProgress}
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            onNavigateWithFilter('all', { status: 'All', dueFilter: 'Overdue' })
          }
          className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Overdue
          </p>
          <p
            className={`font-mono text-2xl font-bold tabular-nums mt-2 ${
              stats.overdue > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-slate-900 dark:text-white'
            }`}
          >
            {stats.overdue}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateWithFilter('all', { status: 'All' })}
          className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Completion Rate
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-2">
            {stats.completionPct}%
          </p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Completion &amp; Workload
            </h2>
            <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {stats.completed}/{stats.total} done
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 shrink-0">
              <svg
                className="w-24 h-24 -rotate-90"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <circle
                  cx="50"
                  cy="50"
                  r={ringRadius}
                  fill="none"
                  strokeWidth="8"
                  className="stroke-slate-100 dark:stroke-slate-800"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={ringRadius}
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="stroke-blue-600 dark:stroke-blue-500 transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                  {stats.completionPct}%
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              {priorityCounts.map((item) => {
                const pct = Math.round((item.count / activeTotal) * 100);
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() =>
                      onNavigateWithFilter('all', {
                        priority: item.label,
                        status: 'All',
                      })
                    }
                    className="w-full text-left space-y-1 group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white font-medium">
                        {item.label} Priority
                      </span>
                      <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${item.barClass}`}
                        style={{
                          width: `${item.count === 0 ? 0 : Math.max(6, pct)}%`,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                By Category
              </h3>
              <button
                type="button"
                onClick={() => onNavigateWithFilter('categories')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Manage
              </button>
            </div>
            <div className="space-y-2.5">
              {categories.slice(0, 6).map((cat) => {
                const catTasks = tasks.filter((t) => t.category === cat.name);
                const catDone = catTasks.filter(
                  (t) => t.status === 'Completed'
                ).length;
                const catPct =
                  catTasks.length === 0
                    ? 0
                    : Math.round((catDone / catTasks.length) * 100);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      onNavigateWithFilter('all', {
                        category: cat.name,
                        status: 'All',
                      })
                    }
                    className="w-full flex items-center justify-between gap-3 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-1.5 -mx-1.5 transition-colors"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-xs shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                        {cat.name}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                      {catDone}/{catTasks.length} ({catPct}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Today&apos;s Focus
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateWithFilter('my-day')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap"
              >
                <span>Open My Day</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayTasks.length === 0 ? (
              <div className="py-6 text-center space-y-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No active tasks scheduled for today yet.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateWithFilter('my-day')}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Plan My Day
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {todayTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleComplete(task)}
                        aria-label={`Complete "${task.title}"`}
                        className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 hover:border-blue-600 flex items-center justify-center shrink-0 text-transparent hover:text-blue-600 transition-colors"
                      >
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        className="text-left min-w-0 group"
                      >
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-xs shrink-0"
                            style={{
                              backgroundColor:
                                categoryMap.get(task.category) ?? '#475569',
                            }}
                          />
                          <span>{task.category}</span>
                          <span>·</span>
                          <span>{task.priority}</span>
                        </p>
                      </button>
                    </div>
                    {task.dueTime && (
                      <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                        {task.dueTime}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Upcoming Deadlines
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateWithFilter('upcoming')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap"
              >
                <span>Full Timeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 border-t border-slate-100 dark:border-slate-800">
                No upcoming scheduled deadlines.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      className="text-left min-w-0 group"
                    >
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {task.category} · {task.status}
                      </p>
                    </button>
                    <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400 inline-flex items-center gap-1.5 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {formatFriendlyDate(task.dueDate, task.dueTime)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
