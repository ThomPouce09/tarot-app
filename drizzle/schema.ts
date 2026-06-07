import { pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Table des tirages de tarot
export const readings = pgTable('readings', {
  id: serial('id').primaryKey(),
  question: text('question'),
  spread: text('spread').notNull(), // 'past_present_future', 'celtic_cross', etc.
  cards: jsonb('cards').notNull(), // [{ name, position, reversed, ... }]
  interpretation: text('interpretation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});