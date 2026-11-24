import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  bulkTaskAction,
  createCategory,
  createTask,
  deleteCategory,
  deleteTask,
  getCategoriesByUser,
  getOrCreateUser,
  getTasksByUser,
  restoreTasks,
  seedSampleTasks,
  updateTask,
  updateUserPreferences,
  type RestoreTaskInput,
} from './src/db/queries.ts';
import type {
  SortOption,
  TaskFormPayload,
  TaskPriority,
  TaskRecurrence,
  TaskStatus,
  ThemeMode,
} from './src/types/task.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];
const VALID_STATUSES: TaskStatus[] = ['Pending', 'In Progress', 'Completed'];
const VALID_RECURRENCES: TaskRecurrence[] = [
  'None',
  'Daily',
  'Weekly',
  'Monthly',
];
const VALID_THEMES: ThemeMode[] = ['light', 'dark'];
const VALID_SORTS: SortOption[] = ['newest', 'oldest', 'priority', 'deadline'];
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

function isValidUuid(id: unknown): id is string {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

function sanitizeTaskPayload(
  body: Record<string, unknown>,
  isPartial = false
): { ok: true; data: Partial<TaskFormPayload> } | { ok: false; error: string } {
  const data: Partial<TaskFormPayload> = {};

  if (!isPartial || body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      return { ok: false, error: 'Task title is required.' };
    }
    if (body.title.trim().length > 200) {
      return { ok: false, error: 'Task title cannot exceed 200 characters.' };
    }
    data.title = body.title.trim();
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string') {
      return { ok: false, error: 'Invalid description format.' };
    }
    if (body.description.length > 2000) {
      return {
        ok: false,
        error: 'Description cannot exceed 2000 characters.',
      };
    }
    data.description = body.description.trim();
  } else if (!isPartial) {
    data.description = '';
  }

  if (body.category !== undefined) {
    if (
      typeof body.category !== 'string' ||
      body.category.trim().length === 0 ||
      body.category.trim().length > 40
    ) {
      return { ok: false, error: 'Category must be between 1 and 40 characters.' };
    }
    data.category = body.category.trim();
  } else if (!isPartial) {
    data.category = 'Personal';
  }

  if (body.priority !== undefined) {
    if (!VALID_PRIORITIES.includes(body.priority as TaskPriority)) {
      return { ok: false, error: 'Invalid task priority.' };
    }
    data.priority = body.priority as TaskPriority;
  } else if (!isPartial) {
    data.priority = 'Medium';
  }

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as TaskStatus)) {
      return { ok: false, error: 'Invalid task status.' };
    }
    data.status = body.status as TaskStatus;
  } else if (!isPartial) {
    data.status = 'Pending';
  }

  if (body.dueDate !== undefined) {
    if (body.dueDate === null || body.dueDate === '') {
      data.dueDate = null;
    } else if (typeof body.dueDate === 'string' && DATE_REGEX.test(body.dueDate)) {
      data.dueDate = body.dueDate;
    } else {
      return { ok: false, error: 'Due date must use YYYY-MM-DD format.' };
    }
  } else if (!isPartial) {
    data.dueDate = null;
  }

  if (body.dueTime !== undefined) {
    if (body.dueTime === null || body.dueTime === '') {
      data.dueTime = null;
    } else if (typeof body.dueTime === 'string' && TIME_REGEX.test(body.dueTime)) {
      data.dueTime = body.dueTime;
    } else {
      return { ok: false, error: 'Due time must use HH:MM format.' };
    }
  } else if (!isPartial) {
    data.dueTime = null;
  }

  if (body.recurrence !== undefined) {
    if (!VALID_RECURRENCES.includes(body.recurrence as TaskRecurrence)) {
      return { ok: false, error: 'Invalid recurrence schedule.' };
    }
    data.recurrence = body.recurrence as TaskRecurrence;
  } else if (!isPartial) {
    data.recurrence = 'None';
  }

  if (body.isMyDay !== undefined) {
    if (typeof body.isMyDay !== 'boolean') {
      return { ok: false, error: 'Invalid My Day flag.' };
    }
    data.isMyDay = body.isMyDay;
  } else if (!isPartial) {
    data.isMyDay = false;
  }

  if (body.reminderEnabled !== undefined) {
    if (typeof body.reminderEnabled !== 'boolean') {
      return { ok: false, error: 'Invalid reminder flag.' };
    }
    data.reminderEnabled = body.reminderEnabled;
  } else if (!isPartial) {
    data.reminderEnabled = false;
  }

  if (body.reminderMinutesBefore !== undefined) {
    const mins = Number(body.reminderMinutesBefore);
    if (!Number.isInteger(mins) || mins < 0 || mins > 1440) {
      return { ok: false, error: 'Invalid reminder offset.' };
    }
    data.reminderMinutesBefore = mins;
  } else if (!isPartial) {
    data.reminderMinutesBefore = 30;
  }

  return { ok: true, data };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || '';
      const displayName =
        typeof req.user!.name === 'string' ? req.user!.name : '';
      const photoUrl =
        typeof req.user!.picture === 'string' ? req.user!.picture : '';

      const user = await getOrCreateUser(uid, email, displayName, photoUrl);
      const userCategories = await getCategoriesByUser(uid);
      res.json({ user, categories: userCategories });
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Failed to synchronize account.';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/tasks', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await getTasksByUser(req.user!.uid);
      res.json({ tasks: rows });
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Failed to load tasks.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/tasks', requireAuth, async (req: AuthRequest, res) => {
    const validation = sanitizeTaskPayload(
      (req.body ?? {}) as Record<string, unknown>,
      false
    );
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const task = await createTask(
        req.user!.uid,
        validation.data as TaskFormPayload
      );
      return res.status(201).json({ task });
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Failed to create task.';
      return res.status(500).json({ error: msg });
    }
  });

  app.patch('/api/tasks/:id', requireAuth, async (req: AuthRequest, res) => {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(400).json({ error: 'Invalid task identifier.' });
    }

    const validation = sanitizeTaskPayload(
      (req.body ?? {}) as Record<string, unknown>,
      true
    );
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const result = await updateTask(req.user!.uid, id, validation.data);
      if (!result) {
        return res.status(404).json({ error: 'Task not found.' });
      }
      return res.json(result);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Failed to update task.';
      return res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/tasks/:id', requireAuth, async (req: AuthRequest, res) => {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(400).json({ error: 'Invalid task identifier.' });
    }

    try {
      const deleted = await deleteTask(req.user!.uid, id);
      if (!deleted) {
        return res.status(404).json({ error: 'Task not found.' });
      }
      return res.json({ deleted });
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Failed to delete task.';
      return res.status(500).json({ error: msg });
    }
  });

  app.post('/api/tasks/restore', requireAuth, async (req: AuthRequest, res) => {
    const rawItems = Array.isArray(req.body?.tasks) ? req.body.tasks : null;
    if (!rawItems || rawItems.length === 0 || rawItems.length > 100) {
      return res.status(400).json({ error: 'Invalid tasks restore payload.' });
    }

    const validItems: RestoreTaskInput[] = [];
    for (const raw of rawItems) {
      const check = sanitizeTaskPayload(
        (raw ?? {}) as Record<string, unknown>,
        false
      );
      if (!check.ok) {
        return res.status(400).json({ error: check.error });
      }
      validItems.push({
        ...(isValidUuid(raw?.id) ? { id: raw.id } : {}),
        ...(check.data as TaskFormPayload),
        completedAt:
          typeof raw?.completedAt === 'string' ? raw.completedAt : null,
      });
    }

    try {
      const restored = await restoreTasks(req.user!.uid, validItems);
      return res.status(201).json({ tasks: restored });
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Failed to restore tasks.';
      return res.status(500).json({ error: msg });
    }
  });

  app.post('/api/tasks/bulk', requireAuth, async (req: AuthRequest, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : null;
    const action = req.body?.action;

    if (
      !ids ||
      ids.length === 0 ||
      ids.length > 200 ||
      !ids.every((id: unknown) => isValidUuid(id))
    ) {
      return res.status(400).json({ error: 'Valid task IDs are required.' });
    }

    if (action !== 'complete' && action !== 'incomplete' && action !== 'delete') {
      return res.status(400).json({ error: 'Unsupported bulk action.' });
    }

    try {
      const result = await bulkTaskAction(req.user!.uid, ids, action);
      return res.json(result);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Bulk operation failed.';
      return res.status(500).json({ error: msg });
    }
  });

  app.post(
    '/api/tasks/seed-sample',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const seeded = await seedSampleTasks(req.user!.uid);
        return res.status(201).json({ tasks: seeded });
      } catch (error: unknown) {
        const msg =
          error instanceof Error
            ? error.message
            : 'Failed to load sample tasks.';
        return res.status(500).json({ error: msg });
      }
    }
  );

  app.get('/api/categories', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await getCategoriesByUser(req.user!.uid);
      return res.json({ categories: rows });
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Failed to load categories.';
      return res.status(500).json({ error: msg });
    }
  });

  app.post('/api/categories', requireAuth, async (req: AuthRequest, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const color =
      typeof req.body?.color === 'string' && HEX_COLOR_REGEX.test(req.body.color)
        ? req.body.color
        : '#2563EB';

    if (!name || name.length > 40) {
      return res
        .status(400)
        .json({ error: 'Category name must be between 1 and 40 characters.' });
    }

    try {
      const result = await createCategory(req.user!.uid, name, color);
      if (result.conflict) {
        return res
          .status(409)
          .json({ error: 'A category with that name already exists.' });
      }
      return res.status(201).json({ category: result.category });
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Failed to create category.';
      return res.status(500).json({ error: msg });
    }
  });

  app.delete(
    '/api/categories/:id',
    requireAuth,
    async (req: AuthRequest, res) => {
      const { id } = req.params;
      if (!isValidUuid(id)) {
        return res.status(400).json({ error: 'Invalid category identifier.' });
      }

      try {
        const result = await deleteCategory(req.user!.uid, id);
        if (result.status === 'not_found') {
          return res.status(404).json({ error: 'Category not found.' });
        }
        if (result.status === 'protected') {
          return res
            .status(400)
            .json({ error: 'Default categories cannot be deleted.' });
        }
        return res.json({ deletedName: result.deletedName });
      } catch (error: unknown) {
        const msg =
          error instanceof Error ? error.message : 'Failed to delete category.';
        return res.status(500).json({ error: msg });
      }
    }
  );

  app.patch(
    '/api/user/preferences',
    requireAuth,
    async (req: AuthRequest, res) => {
      const prefs: {
        theme?: ThemeMode;
        defaultSort?: SortOption;
        notificationsEnabled?: boolean;
      } = {};

      if (req.body?.theme !== undefined) {
        if (!VALID_THEMES.includes(req.body.theme as ThemeMode)) {
          return res.status(400).json({ error: 'Invalid theme option.' });
        }
        prefs.theme = req.body.theme as ThemeMode;
      }

      if (req.body?.defaultSort !== undefined) {
        if (!VALID_SORTS.includes(req.body.defaultSort as SortOption)) {
          return res.status(400).json({ error: 'Invalid default sort option.' });
        }
        prefs.defaultSort = req.body.defaultSort as SortOption;
      }

      if (req.body?.notificationsEnabled !== undefined) {
        if (typeof req.body.notificationsEnabled !== 'boolean') {
          return res
            .status(400)
            .json({ error: 'Invalid notification preference.' });
        }
        prefs.notificationsEnabled = req.body.notificationsEnabled;
      }

      try {
        const updated = await updateUserPreferences(req.user!.uid, prefs);
        if (!updated) {
          return res.status(404).json({ error: 'User profile not found.' });
        }
        return res.json({ user: updated });
      } catch (error: unknown) {
        const msg =
          error instanceof Error
            ? error.message
            : 'Failed to update preferences.';
        return res.status(500).json({ error: msg });
      }
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
