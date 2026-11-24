import {
  Bell,
  Check,
  Edit3,
  Repeat,
  Sun,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  formatFriendlyDate,
  formatShortTimestamp,
  isTaskOverdue,
} from '../lib/taskUtils';
import type { TaskRecord, TaskStatus } from '../types/task';

interface TaskRowProps {
  task: TaskRecord;
  categoryColor?: string;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleComplete: (task: TaskRecord) => void;
  onChangeStatus: (task: TaskRecord, status: TaskStatus) => void;
  onToggleMyDay: (task: TaskRecord) => void;
  onEdit: (task: TaskRecord) => void;
  onDelete: (task: TaskRecord) => void;
}

export function TaskRow({
  task,
  categoryColor = '#475569',
  selected,
  onToggleSelect,
  onToggleComplete,
  onChangeStatus,
  onToggleMyDay,
  onEdit,
  onDelete,
}: TaskRowProps) {
  const isCompleted = task.status === 'Completed';
  const overdue = isTaskOverdue(task);

  const priorityTextColor =
    task.priority === 'High'
      ? 'text-red-600 dark:text-red-400 font-medium'
      : task.priority === 'Medium'
        ? 'text-amber-700 dark:text-amber-400 font-medium'
        : 'text-slate-500 dark:text-slate-400';

  return (
    <div
      className={`group flex items-start gap-3 sm:gap-4 p-4 rounded-xl border transition-colors ${
        selected
          ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <div className="flex items-center gap-2.5 pt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(task.id)}
          aria-label={`Select ${task.title}`}
          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-600 cursor-pointer"
        />

        <button
          type="button"
          onClick={() => onToggleComplete(task)}
          aria-label={
            isCompleted
              ? `Mark "${task.title}" as pending`
              : `Mark "${task.title}" as completed`
          }
          className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            isCompleted
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-600 dark:hover:border-blue-400 text-transparent hover:text-blue-600'
          }`}
        >
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3
            className={`text-[15px] font-semibold leading-snug break-words ${
              isCompleted
                ? 'line-through text-slate-400 dark:text-slate-500'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {task.title}
          </h3>

          <div className="flex items-center gap-2 shrink-0">
            <select
              aria-label={`Status for ${task.title}`}
              value={task.status}
              onChange={(e) =>
                onChangeStatus(task, e.target.value as TaskStatus)
              }
              className="text-xs font-medium bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {task.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
            <span
              className="w-2 h-2 rounded-xs shrink-0"
              style={{ backgroundColor: categoryColor }}
              aria-hidden="true"
            />
            <span>{task.category}</span>
          </span>

          <span aria-hidden="true">·</span>

          <span className={priorityTextColor}>{task.priority} Priority</span>

          {task.dueDate && (
            <>
              <span aria-hidden="true">·</span>
              <span
                className={`font-mono tabular-nums inline-flex items-center gap-1 ${
                  overdue
                    ? 'text-red-600 dark:text-red-400 font-semibold'
                    : ''
                }`}
              >
                {overdue && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                <span>
                  {overdue ? 'Overdue: ' : 'Due '}
                  {formatFriendlyDate(task.dueDate, task.dueTime)}
                </span>
              </span>
            </>
          )}

          {task.recurrence !== 'None' && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Repeat className="w-3 h-3 shrink-0" />
                <span>{task.recurrence}</span>
              </span>
            </>
          )}

          {task.reminderEnabled && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Bell className="w-3 h-3 shrink-0" />
                <span>Reminder</span>
              </span>
            </>
          )}

          {isCompleted && task.completedAt && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Completed {formatShortTimestamp(task.completedAt)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onToggleMyDay(task)}
          title={task.isMyDay ? 'Remove from My Day' : 'Add to My Day'}
          aria-label={
            task.isMyDay
              ? `Remove "${task.title}" from My Day`
              : `Add "${task.title}" to My Day`
          }
          className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            task.isMyDay
              ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
              : 'text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sun className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onEdit(task)}
          title="Edit task"
          aria-label={`Edit "${task.title}"`}
          className="h-9 w-9 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <Edit3 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(task)}
          title="Delete task"
          aria-label={`Delete "${task.title}"`}
          className="h-9 w-9 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
