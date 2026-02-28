import { pgTable, text, integer, serial, date, boolean, timestamp } from 'drizzle-orm/pg-core';

export const beds = pgTable('beds', {
  id: text('id').primaryKey(),
  column: text('column').notNull(),
  position: integer('position').notNull(),
  widthMm: integer('width_mm').notNull(),
  lengthMm: integer('length_mm').notNull(),
});

export const plantings = pgTable('plantings', {
  id: serial('id').primaryKey(),
  bedId: text('bed_id').references(() => beds.id).notNull(),
  plantName: text('plant_name').notNull(),
  variety: text('variety'),
  datePlanted: date('date_planted'),
  dateSown: date('date_sown'),
  expectedHarvestStart: date('expected_harvest_start'),
  expectedHarvestEnd: date('expected_harvest_end'),
  plannedSowDate: date('planned_sow_date'),
  plannedTransplantDate: date('planned_transplant_date'),
  bedFraction: text('bed_fraction').notNull().default('full'),
  status: text('status').notNull().default('growing'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const harvests = pgTable('harvests', {
  id: serial('id').primaryKey(),
  plantingId: integer('planting_id').references(() => plantings.id).notNull(),
  dateHarvested: date('date_harvested').notNull(),
  quantity: text('quantity'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  plantingId: integer('planting_id').references(() => plantings.id),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: date('due_date'),
  category: text('category').notNull(),
  priority: text('priority').notNull().default('medium'),
  isCompleted: boolean('is_completed').notNull().default(false),
  isAiGenerated: boolean('is_ai_generated').notNull().default(false),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const photos = pgTable('photos', {
  id: serial('id').primaryKey(),
  bedId: text('bed_id').references(() => beds.id).notNull(),
  plantingId: integer('planting_id').references(() => plantings.id),
  imageUrl: text('image_url').notNull(),
  caption: text('caption'),
  takenAt: timestamp('taken_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cropHistory = pgTable('crop_history', {
  id: serial('id').primaryKey(),
  bedId: text('bed_id').references(() => beds.id).notNull(),
  plantName: text('plant_name').notNull(),
  plantFamily: text('plant_family'),
  year: integer('year').notNull(),
  season: text('season'),
  successRating: integer('success_rating'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
