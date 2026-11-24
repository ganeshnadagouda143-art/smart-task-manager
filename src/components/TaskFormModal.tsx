import { useEffect, useState, type FormEvent } from 'react';
import { Bell, Repeat, Sun, X } from 'lucide-react';
import { formatShortTimestamp, getTodayStr } from '../lib/taskUtils';
import type {
  CategoryRecord,
  TaskFormPayload,
  TaskPriority,
  TaskRecord,
  TaskRecurrence,
  TaskStatus,
} from '../types/task';

interface TaskFormModalProps {
  isOpen: boolean;
  editingTask: TaskRecord | null;
  categories: CategoryRecord[];
  defaultMyDay?: boolean;
  defaultCategory?: string;
  onClose: () => void;
  onSubmit: (payload: TaskFormPayload, editingId?: string) => Promise<void>;
}

const PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];
const STATUSES: TaskStatus[] = ['Pending', 'In Progress', 'Completed'];
const RECURRENCES: TaskRecurrence[] = ['None', 'Daily', 'Weekly', 'Monthly'];

export function TaskFormModal({
  isOpen,
  editingTask,
  categories,
  defaultMyDay = false,
  defaultCategory = 'Personal',
  onClose,
  onSubmit,
}: TaskFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('Pending');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('None');
  const [isMyDay, setIsMyDay] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(30);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setValidationError(null);
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setCategory(editingTask.category);
      setPriority(editingTask.priority);
      setStatus(editingTask.status);
      setDueDate(editingTask.dueDate ?? '');
      setDueTime(editingTask.dueTime ?? '');
      setRecurrence(editingTask.recurrence);
      setIsMyDay(editingTask.isMyDay);
      setReminderEnabled(editingTask.reminderEnabled);
      setReminderMinutesBefore(editingTask.reminderMinutesBefore);
    } else {
      setTitle('');
      setDescription('');
      setCategory(
        categories.some((c) => c.name === defaultCategory)
          ? defaultCategory
          : categories[0]?.name || 'Personal'
      );
      setPriority('Medium');
      setStatus('Pending');
      setDueDate(defaultMyDay ? getTodayStr() : '');
      setDueTime('');
      setRecurrence('None');
      setIsMyDay(defaultMyDay);
      setReminderEnabled(false);
      setReminderMinutesBefore(30);
    }
  }, [isOpen, editingTask, categories, defaultMyDay, defaultCategory]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('Please enter a task title.');
      return;
    }
    if (trimmedTitle.length > 200) {
      setValidationError('Task title must be 200 characters or fewer.');
      return;
    }
    if (reminderEnabled && !dueDate) {
      setValidationError('Select a due date to enable a task reminder.');
      return;
    }

    setValidationError(null);
    setIsSaving(true);
    try {
      await onSubmit(
        {
          title: trimmedTitle,
          description: description.trim(),
          category,
          priority,
          status,
          dueDate: dueDate || null,
          dueTime: dueTime || null,
          recurrence,
          isMyDay,
          reminderEnabled,
          reminderMinutesBefore,
        },
        editingTask?.id
      );
      onClose();
    } catch (err: unknown) {
      setValidationError(
        err instanceof Error ? err.message : 'Unable to save task.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[1px] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2
              id="task-modal-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h2>
            {editingTask && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                Created {formatShortTimestamp(editingTask.createdAt)} · Updated{' '}
                {formatShortTimestamp(editingTask.updatedAt)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close task form"
            className="h-9 w-9 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {validationError && (
            <div
              role="alert"
              className="p-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300"
            >
              {validationError}
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="task-title-input"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Task Title <span className="text-red-600">*</span>
            </label>
            <input
              id="task-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Prepare sprint review slides"
              maxLength={200}
              autoFocus
              className="w-full min-h-[42px] px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="task-desc-input"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Description
            </label>
            <textarea
              id="task-desc-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context, links, or acceptance criteria..."
              maxLength={2000}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="task-category-select"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Category
              </label>
              <select
                id="task-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Priority
              </span>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`min-h-[34px] px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      priority === p
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Status
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`min-h-[34px] px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    status === s
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="task-due-date"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Due Date
              </label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="task-due-time"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Due Time
              </label>
              <input
                id="task-due-time"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="task-recurrence-select"
                className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                <Repeat className="w-3.5 h-3.5 text-slate-400" />
                <span>Recurrence</span>
              </label>
              <select
                id="task-recurrence-select"
                value={recurrence}
                onChange={(e) =>
                  setRecurrence(e.target.value as TaskRecurrence)
                }
                className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {RECURRENCES.map((rec) => (
                  <option key={rec} value={rec}>
                    {rec === 'None' ? 'Does not repeat' : rec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isMyDay}
                onChange={(e) => setIsMyDay(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-600"
              />
              <Sun className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Pin to My Day
              </span>
            </label>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-600"
                />
                <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Reminder
                </span>
              </label>

              {reminderEnabled && (
                <select
                  aria-label="Reminder lead time"
                  value={reminderMinutesBefore}
                  onChange={(e) =>
                    setReminderMinutesBefore(Number(e.target.value))
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value={15}>15 min before</option>
                  <option value={30}>30 min before</option>
                  <option value={60}>1 hour before</option>
                  <option value={120}>2 hours before</option>
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[40px] px-5 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              {isSaving
                ? 'Saving...'
                : editingTask
                  ? 'Save Changes'
                  : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
