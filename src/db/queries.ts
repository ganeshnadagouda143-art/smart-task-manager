import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import { categories, tasks, users } from './schema.ts';
import type {
  SortOption,
  TaskFormPayload,
  TaskPriority,
  TaskRecurrence,
  TaskStatus,
  ThemeMode,
} from '../types/task.ts';

export const DEFAULT_CATEGORY_SEEDS: Array<{ name: string; color: string }> = [
  { name: 'Personal', color: '#2563EB' },
  { name: 'Education', color: '#7C3AED' },
  { name: 'Work', color: '#0F766E' },
  { name: 'Shopping', color: '#D97706' },
  { name: 'Health', color: '#16A34A' },
  { name: 'Other', color: '#475569' },
];

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function advanceDateByRecurrence(
  currentDueDate: string | null,
  recurrence: TaskRecurrence
): string {
  const base = currentDueDate ? new Date(`${currentDueDate}T00:00:00`) : new Date();
  const next = new Date(base.getTime());

  if (recurrence === 'Daily') {
    next.setDate(next.getDate() + 1);
  } else if (recurrence === 'Weekly') {
    next.setDate(next.getDate() + 7);
  } else if (recurrence === 'Monthly') {
    next.setMonth(next.getMonth() + 1);
  }

  return formatLocalDate(next);
}

export async function ensureDefaultCategories(userId: string) {
  try {
    const existing = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId));

    if (existing.length === 0) {
      await db.insert(categories).values(
        DEFAULT_CATEGORY_SEEDS.map((cat) => ({
          userId,
          name: cat.name,
          color: cat.color,
          isDefault: true,
        }))
      );
      return await db
        .select()
        .from(categories)
        .where(eq(categories.userId, userId))
        .orderBy(desc(categories.isDefault), asc(categories.createdAt));
    }

    return existing.sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  } catch (error) {
    console.error('Database query failed in ensureDefaultCategories:', error);
    throw new Error('Failed to load workspace categories.', { cause: error });
  }
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName: string,
  photoUrl: string
) {
  try {
    const [user] = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName,
        photoUrl,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName,
          photoUrl,
          updatedAt: new Date(),
        },
      })
      .returning();

    await ensureDefaultCategories(uid);
    return user;
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function getTasksByUser(userId: string) {
  try {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt));
  } catch (error) {
    console.error('Database query failed in getTasksByUser:', error);
    throw new Error('Failed to retrieve tasks.', { cause: error });
  }
}

export async function createTask(userId: string, payload: TaskFormPayload) {
  try {
    const isCompleted = payload.status === 'Completed';
    const [created] = await db
      .insert(tasks)
      .values({
        userId,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        priority: payload.priority,
        status: payload.status,
        dueDate: payload.dueDate,
        dueTime: payload.dueTime,
        recurrence: payload.recurrence,
        isMyDay: payload.isMyDay,
        reminderEnabled: payload.reminderEnabled,
        reminderMinutesBefore: payload.reminderMinutesBefore,
        completedAt: isCompleted ? new Date() : null,
      })
      .returning();

    return created;
  } catch (error) {
    console.error('Database query failed in createTask:', error);
    throw new Error('Failed to create task.', { cause: error });
  }
}

export async function updateTask(
  userId: string,
  taskId: string,
  updates: Partial<TaskFormPayload>
) {
  try {
    const [existing] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

    if (!existing) {
      return null;
    }

    const nextStatus = (updates.status ?? existing.status) as TaskStatus;
    const becameCompleted =
      existing.status !== 'Completed' && nextStatus === 'Completed';
    const becameIncomplete =
      existing.status === 'Completed' && nextStatus !== 'Completed';

    const completedAt = becameCompleted
      ? new Date()
      : becameIncomplete
        ? null
        : existing.completedAt;

    const [updated] = await db
      .update(tasks)
      .set({
        ...(updates.title !== undefined ? { title: updates.title } : {}),
        ...(updates.description !== undefined
          ? { description: updates.description }
          : {}),
        ...(updates.category !== undefined ? { category: updates.category } : {}),
        ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        ...(updates.dueDate !== undefined ? { dueDate: updates.dueDate } : {}),
        ...(updates.dueTime !== undefined ? { dueTime: updates.dueTime } : {}),
        ...(updates.recurrence !== undefined
          ? { recurrence: updates.recurrence }
          : {}),
        ...(updates.isMyDay !== undefined ? { isMyDay: updates.isMyDay } : {}),
        ...(updates.reminderEnabled !== undefined
          ? { reminderEnabled: updates.reminderEnabled }
          : {}),
        ...(updates.reminderMinutesBefore !== undefined
          ? { reminderMinutesBefore: updates.reminderMinutesBefore }
          : {}),
        completedAt,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    let nextOccurrence = null;
    const effectiveRecurrence = (updated.recurrence || 'None') as TaskRecurrence;
    if (becameCompleted && effectiveRecurrence !== 'None') {
      const nextDueDate = advanceDateByRecurrence(
        updated.dueDate,
        effectiveRecurrence
      );
      const [spawned] = await db
        .insert(tasks)
        .values({
          userId,
          title: updated.title,
          description: updated.description,
          category: updated.category,
          priority: updated.priority,
          status: 'Pending',
          dueDate: nextDueDate,
          dueTime: updated.dueTime,
          recurrence: effectiveRecurrence,
          isMyDay: false,
          reminderEnabled: updated.reminderEnabled,
          reminderMinutesBefore: updated.reminderMinutesBefore,
          completedAt: null,
        })
        .returning();
      nextOccurrence = spawned;
    }

    return { task: updated, nextOccurrence };
  } catch (error) {
    console.error('Database query failed in updateTask:', error);
    throw new Error('Failed to update task.', { cause: error });
  }
}

export async function deleteTask(userId: string, taskId: string) {
  try {
    const [deleted] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();
    return deleted ?? null;
  } catch (error) {
    console.error('Database query failed in deleteTask:', error);
    throw new Error('Failed to delete task.', { cause: error });
  }
}

export interface RestoreTaskInput {
  id?: string;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  dueTime: string | null;
  recurrence: TaskRecurrence;
  isMyDay: boolean;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
  completedAt: string | null;
}

export async function restoreTasks(
  userId: string,
  items: RestoreTaskInput[]
) {
  try {
    if (items.length === 0) return [];
    const restored = await db
      .insert(tasks)
      .values(
        items.map((item) => ({
          ...(item.id ? { id: item.id } : {}),
          userId,
          title: item.title,
          description: item.description,
          category: item.category,
          priority: item.priority,
          status: item.status,
          dueDate: item.dueDate,
          dueTime: item.dueTime,
          recurrence: item.recurrence,
          isMyDay: item.isMyDay,
          reminderEnabled: item.reminderEnabled,
          reminderMinutesBefore: item.reminderMinutesBefore,
          completedAt: item.completedAt ? new Date(item.completedAt) : null,
        }))
      )
      .onConflictDoNothing()
      .returning();

    return restored;
  } catch (error) {
    console.error('Database query failed in restoreTasks:', error);
    throw new Error('Failed to restore deleted tasks.', { cause: error });
  }
}

export async function bulkTaskAction(
  userId: string,
  ids: string[],
  action: 'complete' | 'incomplete' | 'delete'
) {
  try {
    if (ids.length === 0) {
      return { updated: [], deleted: [], spawned: [] };
    }

    if (action === 'delete') {
      const deleted = await db
        .delete(tasks)
        .where(and(eq(tasks.userId, userId), inArray(tasks.id, ids)))
        .returning();
      return { updated: [], deleted, spawned: [] };
    }

    const existingList = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), inArray(tasks.id, ids)));

    if (existingList.length === 0) {
      return { updated: [], deleted: [], spawned: [] };
    }

    const now = new Date();
    const targetStatus: TaskStatus =
      action === 'complete' ? 'Completed' : 'Pending';

    const updated = await db
      .update(tasks)
      .set({
        status: targetStatus,
        completedAt: action === 'complete' ? now : null,
        updatedAt: now,
      })
      .where(and(eq(tasks.userId, userId), inArray(tasks.id, ids)))
      .returning();

    const spawned = [];
    if (action === 'complete') {
      const recurringToSpawn = existingList.filter(
        (t) => t.status !== 'Completed' && t.recurrence !== 'None'
      );
      if (recurringToSpawn.length > 0) {
        const inserted = await db
          .insert(tasks)
          .values(
            recurringToSpawn.map((t) => ({
              userId,
              title: t.title,
              description: t.description,
              category: t.category,
              priority: t.priority,
              status: 'Pending' as TaskStatus,
              dueDate: advanceDateByRecurrence(
                t.dueDate,
                t.recurrence as TaskRecurrence
              ),
              dueTime: t.dueTime,
              recurrence: t.recurrence,
              isMyDay: false,
              reminderEnabled: t.reminderEnabled,
              reminderMinutesBefore: t.reminderMinutesBefore,
              completedAt: null,
            }))
          )
          .returning();
        spawned.push(...inserted);
      }
    }

    return { updated, deleted: [], spawned };
  } catch (error) {
    console.error('Database query failed in bulkTaskAction:', error);
    throw new Error('Failed to apply bulk action.', { cause: error });
  }
}

export async function getCategoriesByUser(userId: string) {
  return ensureDefaultCategories(userId);
}

export async function createCategory(
  userId: string,
  name: string,
  color: string
) {
  try {
    const existing = await ensureDefaultCategories(userId);
    const duplicate = existing.find(
      (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (duplicate) {
      return { conflict: true as const, category: null };
    }

    const [created] = await db
      .insert(categories)
      .values({
        userId,
        name: name.trim(),
        color,
        isDefault: false,
      })
      .returning();

    return { conflict: false as const, category: created };
  } catch (error) {
    console.error('Database query failed in createCategory:', error);
    throw new Error('Failed to create category.', { cause: error });
  }
}

export async function deleteCategory(userId: string, categoryId: string) {
  try {
    const [target] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));

    if (!target) {
      return { status: 'not_found' as const };
    }
    if (target.isDefault) {
      return { status: 'protected' as const };
    }

    await db
      .update(tasks)
      .set({ category: 'Other', updatedAt: new Date() })
      .where(and(eq(tasks.userId, userId), eq(tasks.category, target.name)));

    await db
      .delete(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));

    return { status: 'deleted' as const, deletedName: target.name };
  } catch (error) {
    console.error('Database query failed in deleteCategory:', error);
    throw new Error('Failed to delete category.', { cause: error });
  }
}

export async function updateUserPreferences(
  userId: string,
  prefs: {
    theme?: ThemeMode;
    defaultSort?: SortOption;
    notificationsEnabled?: boolean;
  }
) {
  try {
    const [updated] = await db
      .update(users)
      .set({
        ...(prefs.theme !== undefined ? { theme: prefs.theme } : {}),
        ...(prefs.defaultSort !== undefined
          ? { defaultSort: prefs.defaultSort }
          : {}),
        ...(prefs.notificationsEnabled !== undefined
          ? { notificationsEnabled: prefs.notificationsEnabled }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.uid, userId))
      .returning();

    return updated ?? null;
  } catch (error) {
    console.error('Database query failed in updateUserPreferences:', error);
    throw new Error('Failed to update user preferences.', { cause: error });
  }
}

export async function seedSampleTasks(userId: string) {
  try {
    const today = new Date();
    const yesterday = new Date(today.getTime());
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today.getTime());
    tomorrow.setDate(tomorrow.getDate() + 1);
    const inThreeDays = new Date(today.getTime());
    inThreeDays.setDate(inThreeDays.getDate() + 3);

    const sampleRows = [
      {
        userId,
        title: 'Finalize Q4 product roadmap presentation',
        description:
          'Align engineering milestones with customer feedback metrics and prepare executive slides.',
        category: 'Work',
        priority: 'High',
        status: 'In Progress',
        dueDate: formatLocalDate(today),
        dueTime: '15:00',
        recurrence: 'None',
        isMyDay: true,
        reminderEnabled: true,
        reminderMinutesBefore: 30,
      },
      {
        userId,
        title: 'Submit quarterly tax documentation',
        description:
          'Verify expense receipts and send signed forms to the accounting team.',
        category: 'Personal',
        priority: 'High',
        status: 'Pending',
        dueDate: formatLocalDate(yesterday),
        dueTime: '17:00',
        recurrence: 'None',
        isMyDay: true,
        reminderEnabled: true,
        reminderMinutesBefore: 60,
      },
      {
        userId,
        title: 'Morning hydration and 30-minute run',
        description: 'Steady pace around the park loop followed by stretching.',
        category: 'Health',
        priority: 'Medium',
        status: 'Pending',
        dueDate: formatLocalDate(today),
        dueTime: '07:30',
        recurrence: 'Daily',
        isMyDay: true,
        reminderEnabled: false,
        reminderMinutesBefore: 15,
      },
      {
        userId,
        title: 'Complete distributed systems reading notes',
        description: 'Summarize consensus protocols chapter and highlight key proofs.',
        category: 'Education',
        priority: 'Medium',
        status: 'Pending',
        dueDate: formatLocalDate(tomorrow),
        dueTime: '19:00',
        recurrence: 'None',
        isMyDay: false,
        reminderEnabled: false,
        reminderMinutesBefore: 30,
      },
      {
        userId,
        title: 'Weekly grocery restock',
        description: 'Fresh produce, oat milk, espresso beans, and sourdough.',
        category: 'Shopping',
        priority: 'Low',
        status: 'Pending',
        dueDate: formatLocalDate(inThreeDays),
        dueTime: '11:00',
        recurrence: 'Weekly',
        isMyDay: false,
        reminderEnabled: false,
        reminderMinutesBefore: 30,
      },
      {
        userId,
        title: 'Configure automated database backups',
        description: 'Verify retention policies and run restore drill.',
        category: 'Work',
        priority: 'High',
        status: 'Completed',
        dueDate: formatLocalDate(yesterday),
        dueTime: '14:00',
        recurrence: 'None',
        isMyDay: false,
        reminderEnabled: false,
        reminderMinutesBefore: 30,
        completedAt: yesterday,
      },
    ];

    return await db.insert(tasks).values(sampleRows).returning();
  } catch (error) {
    console.error('Database query failed in seedSampleTasks:', error);
    throw new Error('Failed to load sample workspace tasks.', { cause: error });
  }
}
