import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  uid: text('uid').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default(''),
  photoUrl: text('photo_url').notNull().default(''),
  theme: text('theme').notNull().default('light'),
  defaultSort: text('default_sort').notNull().default('newest'),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#2563EB'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  category: text('category').notNull().default('Personal'),
  priority: text('priority').notNull().default('Medium'), // 'High' | 'Medium' | 'Low'
  status: text('status').notNull().default('Pending'), // 'Pending' | 'In Progress' | 'Completed'
  dueDate: text('due_date'), // YYYY-MM-DD or null
  dueTime: text('due_time'), // HH:MM or null
  recurrence: text('recurrence').notNull().default('None'), // 'None' | 'Daily' | 'Weekly' | 'Monthly'
  isMyDay: boolean('is_my_day').notNull().default(false),
  reminderEnabled: boolean('reminder_enabled').notNull().default(false),
  reminderMinutesBefore: integer('reminder_minutes_before').notNull().default(30),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
  categories: many(categories),
}));

export const categoriesRelations = relations(categories, ({ one }) => ({
  owner: one(users, {
    fields: [categories.userId],
    references: [users.uid],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  owner: one(users, {
    fields: [tasks.userId],
    references: [users.uid],
  }),
}));
