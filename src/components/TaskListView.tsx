import { useState, type FormEvent } from 'react';
import {
  CheckSquare,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import {
  filterAndSortTasks,
  getEndOfWeekStr,
  getTodayStr,
  getTomorrowStr,
  isTaskDueToday,
  isTaskOverdue,
  type TaskFilterCriteria,
} from '../lib/taskUtils';
import type {
  CategoryRecord,
  SortOption,
  TaskFormPayload,
  TaskPriority,
  TaskRecord,
  TaskStatus,
} from '../types/task';
import { TaskRow } from './TaskRow';

interface TaskListViewProps {
  mode: 'all' | 'my-day' | 'upcoming' | 'completed';
  tasks: TaskRecord[];
  categories: CategoryRecord[];
  filters: TaskFilterCriteria;
  onChangeFilters: (next: TaskFilterCriteria) => void;
  onResetFilters: () => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectMany: (ids: string[]) => void;
  onClearSelection: () => void;
  onQuickCreate: (payload: TaskFormPayload) => Promise<void>;
  onOpenNewTask: () => void;
  onToggleComplete: (task: TaskRecord) => void;
  onChangeStatus: (task: TaskRecord, status: TaskStatus) => void;
  onToggleMyDay: (task: TaskRecord) => void;
  onEditTask: (task: TaskRecord) => void;
  onDeleteTask: (task: TaskRecord) => void;
  onBulkComplete: (ids: string[]) => void;
  onBulkIncomplete: (ids: string[]) => void;
  onBulkDelete: (ids: string[]) => void;
}

export function TaskListView({
  mode,
  tasks,
  categories,
  filters,
  onChangeFilters,
  onResetFilters,
  selectedIds,
  onToggleSelect,
  onSelectMany,
  onClearSelection,
  onQuickCreate,
  onOpenNewTask,
  onToggleComplete,
  onChangeStatus,
  onToggleMyDay,
  onEditTask,
  onDeleteTask,
  onBulkComplete,
  onBulkIncomplete,
  onBulkDelete,
}: TaskListViewProps) {
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] = useState(
    categories[0]?.name ?? 'Personal'
  );
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('Medium');
  const [quickError, setQuickError] = useState<string | null>(null);
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  const categoryColorMap = new Map(categories.map((c) => [c.name, c.color]));

  const baseTasks = tasks.filter((task) => {
    if (mode === 'my-day') {
      return task.isMyDay || isTaskDueToday(task);
    }
    if (mode === 'upcoming') {
      return task.status !== 'Completed';
    }
    if (mode === 'completed') {
      return task.status === 'Completed';
    }
    return true;
  });

  const effectiveFilters: TaskFilterCriteria =
    mode === 'completed'
      ? { ...filters, status: 'Completed' }
      : mode === 'upcoming'
        ? { ...filters, sortBy: 'deadline' }
        : filters;

  const visibleTasks = filterAndSortTasks(baseTasks, effectiveFilters);

  const suggestedForMyDay =
    mode === 'my-day'
      ? tasks
          .filter(
            (t) =>
              t.status !== 'Completed' && !t.isMyDay && !isTaskDueToday(t)
          )
          .slice(0, 6)
      : [];

  const allVisibleSelected =
    visibleTasks.length > 0 &&
    visibleTasks.every((t) => selectedIds.includes(t.id));

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      onClearSelection();
    } else {
      onSelectMany(visibleTasks.map((t) => t.id));
    }
  };

  const handleQuickAdd = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed) {
      setQuickError('Enter a task title before adding.');
      return;
    }
    setQuickError(null);
    setIsQuickSaving(true);
    try {
      await onQuickCreate({
        title: trimmed,
        description: '',
        category: quickCategory,
        priority: quickPriority,
        status: 'Pending',
        dueDate: mode === 'my-day' ? getTodayStr() : null,
        dueTime: null,
        recurrence: 'None',
        isMyDay: mode === 'my-day',
        reminderEnabled: false,
        reminderMinutesBefore: 30,
      });
      setQuickTitle('');
    } catch (err: unknown) {
      setQuickError(
        err instanceof Error ? err.message : 'Could not add task.'
      );
    } finally {
      setIsQuickSaving(false);
    }
  };

  const renderTaskGroup = (title: string, groupTasks: TaskRecord[]) => {
    if (groupTasks.length === 0) return null;
    return (
      <section key={title} className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <h2 className="font-display text-sm font-bold text-slate-800 dark:text-slate-200">
            {title}
          </h2>
          <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {groupTasks.length}
          </span>
        </div>
        <div className="space-y-2.5">
          {groupTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              categoryColor={categoryColorMap.get(task.category)}
              selected={selectedIds.includes(task.id)}
              onToggleSelect={onToggleSelect}
              onToggleComplete={onToggleComplete}
              onChangeStatus={onChangeStatus}
              onToggleMyDay={onToggleMyDay}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </div>
      </section>
    );
  };

  const renderUpcomingGroups = () => {
    const todayStr = getTodayStr();
    const tomorrowStr = getTomorrowStr();
    const weekEndStr = getEndOfWeekStr();

    const overdue = visibleTasks.filter((t) => isTaskOverdue(t));
    const today = visibleTasks.filter(
      (t) => !isTaskOverdue(t) && t.dueDate === todayStr
    );
    const tomorrow = visibleTasks.filter((t) => t.dueDate === tomorrowStr);
    const thisWeek = visibleTasks.filter(
      (t) => t.dueDate && t.dueDate > tomorrowStr && t.dueDate <= weekEndStr
    );
    const later = visibleTasks.filter(
      (t) => t.dueDate && t.dueDate > weekEndStr
    );
    const unscheduled = visibleTasks.filter((t) => !t.dueDate);

    return (
      <div className="space-y-8">
        {renderTaskGroup('Overdue', overdue)}
        {renderTaskGroup('Today', today)}
        {renderTaskGroup('Tomorrow', tomorrow)}
        {renderTaskGroup('This Week', thisWeek)}
        {renderTaskGroup('Later', later)}
        {renderTaskGroup('Unscheduled', unscheduled)}
      </div>
    );
  };

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    (mode !== 'completed' && filters.status !== 'All') ||
    filters.priority !== 'All' ||
    filters.category !== 'All' ||
    filters.dueFilter !== 'All';

  return (
    <div className="space-y-5">
      {(mode === 'all' || mode === 'my-day') && (
        <form
          onSubmit={handleQuickAdd}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => {
                setQuickTitle(e.target.value);
                if (quickError) setQuickError(null);
              }}
              placeholder={
                mode === 'my-day'
                  ? 'Quick add a task for today...'
                  : 'Quick add a new task...'
              }
              maxLength={200}
              className="flex-1 min-h-[40px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <div className="flex items-center gap-2 shrink-0">
              <select
                aria-label="Quick add category"
                value={quickCategory}
                onChange={(e) => setQuickCategory(e.target.value)}
                className="min-h-[40px] px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Quick add priority"
                value={quickPriority}
                onChange={(e) =>
                  setQuickPriority(e.target.value as TaskPriority)
                }
                className="min-h-[40px] px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <button
                type="submit"
                disabled={isQuickSaving}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>{isQuickSaving ? 'Adding...' : 'Add'}</span>
              </button>
            </div>
          </div>
          {quickError && (
            <p className="text-xs text-red-600 dark:text-red-400 px-1">
              {quickError}
            </p>
          )}
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={filters.search}
              onChange={(e) =>
                onChangeFilters({ ...filters, search: e.target.value })
              }
              placeholder="Search tasks by title or description..."
              aria-label="Search tasks"
              className="w-full min-h-[40px] pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode !== 'completed' && mode !== 'upcoming' && (
              <select
                aria-label="Filter by status"
                value={filters.status}
                onChange={(e) =>
                  onChangeFilters({
                    ...filters,
                    status: e.target.value as 'All' | TaskStatus,
                  })
                }
                className="min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            )}

            <select
              aria-label="Filter by priority"
              value={filters.priority}
              onChange={(e) =>
                onChangeFilters({
                  ...filters,
                  priority: e.target.value as 'All' | TaskPriority,
                })
              }
              className="min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="All">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>

            <select
              aria-label="Filter by category"
              value={filters.category}
              onChange={(e) =>
                onChangeFilters({ ...filters, category: e.target.value })
              }
              className="min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>

            {mode === 'all' && (
              <select
                aria-label="Filter by due date"
                value={filters.dueFilter}
                onChange={(e) =>
                  onChangeFilters({
                    ...filters,
                    dueFilter: e.target.value as TaskFilterCriteria['dueFilter'],
                  })
                }
                className="min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="All">Any Due Date</option>
                <option value="Today">Due Today</option>
                <option value="Week">Due This Week</option>
                <option value="Overdue">Overdue</option>
                <option value="NoDate">No Deadline</option>
                <option value="CustomDate">Specific Date</option>
              </select>
            )}

            {mode === 'all' && filters.dueFilter === 'CustomDate' && (
              <input
                type="date"
                aria-label="Pick specific due date"
                value={filters.customDate}
                onChange={(e) =>
                  onChangeFilters({ ...filters, customDate: e.target.value })
                }
                className="min-h-[40px] px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            )}

            {mode !== 'upcoming' && (
              <select
                aria-label="Sort tasks"
                value={filters.sortBy}
                onChange={(e) =>
                  onChangeFilters({
                    ...filters,
                    sortBy: e.target.value as SortOption,
                  })
                }
                className="min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="priority">Sort: Priority</option>
                <option value="deadline">Sort: Deadline</option>
              </select>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="min-h-[40px] px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400 font-medium">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={handleToggleSelectAll}
                disabled={visibleTasks.length === 0}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-600"
              />
              <span>Select all ({visibleTasks.length})</span>
            </label>

            {selectedIds.length > 0 && (
              <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400 font-medium">
                {selectedIds.length} selected
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 && (
              <>
                {mode !== 'completed' && (
                  <button
                    type="button"
                    onClick={() => onBulkComplete(selectedIds)}
                    className="min-h-[32px] px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Complete Selected</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onBulkIncomplete(selectedIds)}
                  className="min-h-[32px] px-3 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Mark Pending</span>
                </button>

                <button
                  type="button"
                  onClick={() => onBulkDelete(selectedIds)}
                  className="min-h-[32px] px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected</span>
                </button>
              </>
            )}

            {mode === 'completed' &&
              selectedIds.length === 0 &&
              visibleTasks.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onBulkDelete(visibleTasks.map((t) => t.id))
                  }
                  className="min-h-[32px] px-3 py-1 rounded-md border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Completed</span>
                </button>
              )}
          </div>
        </div>
      </div>

      {visibleTasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
          <SlidersHorizontal className="w-7 h-7 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <p className="font-display text-base font-semibold text-slate-900 dark:text-white">
              {hasActiveFilters
                ? 'No tasks match your active filters'
                : mode === 'completed'
                  ? 'No completed tasks yet'
                  : mode === 'my-day'
                    ? 'Your day is wide open'
                    : mode === 'upcoming'
                      ? 'No active upcoming tasks'
                      : 'No tasks created yet'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {hasActiveFilters
                ? 'Try clearing your search query or adjusting the status and category filters.'
                : 'Add a task to organize your schedule and track progress.'}
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={onResetFilters}
                className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Clear Filters
              </button>
            ) : (
              mode !== 'completed' && (
                <button
                  type="button"
                  onClick={onOpenNewTask}
                  className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white text-sm font-medium inline-flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Task</span>
                </button>
              )
            )}
          </div>
        </div>
      ) : mode === 'upcoming' ? (
        renderUpcomingGroups()
      ) : (
        <div className="space-y-2.5">
          {visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              categoryColor={categoryColorMap.get(task.category)}
              selected={selectedIds.includes(task.id)}
              onToggleSelect={onToggleSelect}
              onToggleComplete={onToggleComplete}
              onChangeStatus={onChangeStatus}
              onToggleMyDay={onToggleMyDay}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </div>
      )}

      {mode === 'my-day' && suggestedForMyDay.length > 0 && (
        <section className="pt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Sun className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2>Suggested from your backlog</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestedForMyDay.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {task.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {task.category} · {task.priority} Priority
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleMyDay(task)}
                  className="min-h-[34px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to My Day</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
