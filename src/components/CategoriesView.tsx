import { useState, type FormEvent } from 'react';
import { ArrowRight, FolderPlus, Trash2 } from 'lucide-react';
import type { CategoryRecord, TaskRecord } from '../types/task';

interface CategoriesViewProps {
  categories: CategoryRecord[];
  tasks: TaskRecord[];
  onCreateCategory: (name: string, color: string) => Promise<void>;
  onDeleteCategory: (category: CategoryRecord) => void;
  onOpenCategoryTasks: (categoryName: string) => void;
}

const SWATCH_COLORS = [
  '#2563EB',
  '#7C3AED',
  '#0F766E',
  '#D97706',
  '#16A34A',
  '#DC2626',
  '#DB2777',
  '#475569',
];

export function CategoriesView({
  categories,
  tasks,
  onCreateCategory,
  onDeleteCategory,
  onOpenCategoryTasks,
}: CategoriesViewProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(SWATCH_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a category name.');
      return;
    }
    if (trimmed.length > 40) {
      setError('Category name must be 40 characters or fewer.');
      return;
    }

    setError(null);
    setIsCreating(true);
    try {
      await onCreateCategory(trimmed, color);
      setName('');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to create category.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
      >
        <div className="space-y-1">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Create Custom Category
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Organize tasks beyond the built-in Personal, Education, Work,
            Shopping, Health, and Other groups.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g., Finance, Travel, Side Project"
            aria-label="Custom category name"
            maxLength={40}
            className="flex-1 min-h-[42px] px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />

          <div
            className="flex items-center gap-2"
            role="radiogroup"
            aria-label="Category color"
          >
            {SWATCH_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => setColor(swatch)}
                aria-label={`Select color ${swatch}`}
                aria-checked={color === swatch}
                role="radio"
                className={`w-7 h-7 rounded-md transition-transform ${
                  color === swatch
                    ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900 scale-105'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="min-h-[42px] px-5 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <FolderPlus className="w-4 h-4" />
            <span>{isCreating ? 'Creating...' : 'Create Category'}</span>
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const catTasks = tasks.filter((t) => t.category === cat.name);
          const completedCount = catTasks.filter(
            (t) => t.status === 'Completed'
          ).length;
          const pendingCount = catTasks.length - completedCount;
          const pct =
            catTasks.length === 0
              ? 0
              : Math.round((completedCount / catTasks.length) * 100);

          return (
            <div
              key={cat.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-xs shrink-0"
                      style={{ backgroundColor: cat.color }}
                      aria-hidden="true"
                    />
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
                      {cat.name}
                    </h3>
                  </div>

                  {cat.isDefault ? (
                    <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                      Built-in
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(cat)}
                      title={`Delete ${cat.name}`}
                      aria-label={`Delete category ${cat.name}`}
                      className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center shrink-0 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  <span>{catTasks.length} total</span>
                  <span aria-hidden="true">·</span>
                  <span>{pendingCount} active</span>
                  <span aria-hidden="true">·</span>
                  <span>{completedCount} done</span>
                </div>

                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenCategoryTasks(cat.name)}
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-between transition-colors"
              >
                <span>View Tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
