import { pgTable, serial, text, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

// Table des utilisateurs
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }),
  password: varchar('password', { length: 64 }).notNull(),
  gender: varchar('gender', { length: 20 }),
  age: integer('age'),
  phone: varchar('phone', { length: 50 }),
  comment: text('comment'),
  emailConfirmed: varchar('email_confirmed', { length: 5 }).default('false'),
  confirmationToken: varchar('confirmation_token', { length: 255 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Table des tirages de tarot
export const readings = pgTable('readings', {
  id: serial('id').primaryKey(),
  question: text('question'),
  spread: text('spread').notNull(),
  cards: text('cards').notNull(),
  interpretation: text('interpretation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Table des 64 hexagrammes du Yi Jing avec périodes calendaires
export const hexagrams = pgTable('hexagrams', {
  id: serial('id').primaryKey(),
  numero: integer('numero').notNull().unique(),
  dateDebut: varchar('date_debut', { length: 5 }).notNull(),
  dateFin: varchar('date_fin', { length: 5 }).notNull(),
  caractere: varchar('caractere', { length: 1 }).notNull(),
  pinyin: varchar('pinyin', { length: 50 }).notNull(),
  element: varchar('element', { length: 100 }),
  strategie: varchar('strategie', { length: 100 }),
  attitude: varchar('attitude', { length: 100 }),
  conseil: text('conseil'),
  synthese: text('synthese'),
  lignes: text('lignes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
