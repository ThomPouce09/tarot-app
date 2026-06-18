import { pgTable, serial, text, timestamp, jsonb, boolean, varchar, integer } from 'drizzle-orm/pg-core';

// Table des utilisateurs
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }),
  password: varchar('password', { length: 64 }).notNull(), // SHA256 hash (64 chars)
  gender: varchar('gender', { length: 20 }), // 'male', 'female', 'other'
  age: integer('age'),
  phone: varchar('phone', { length: 50 }),
  comment: text('comment'),
  emailConfirmed: boolean('email_confirmed').default(false).notNull(),
  confirmationToken: varchar('confirmation_token', { length: 255 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Table des tirages de tarot
export const readings = pgTable('readings', {
  id: serial('id').primaryKey(),
  question: text('question'),
  spread: text('spread').notNull(), // 'past_present_future', 'celtic_cross', etc.
  cards: jsonb('cards').notNull(), // [{ name, position, reversed, ... }]
  interpretation: text('interpretation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});