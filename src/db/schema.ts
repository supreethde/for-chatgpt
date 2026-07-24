import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, numeric } from 'drizzle-orm/pg-core';

// Define the 'users' table.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name').default('Restaurant Owner'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define the 'inquiries' table.
export const inquiries = pgTable('inquiries', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  restaurantName: text('restaurant_name').notNull(),
  contactNumber: text('contact_number').notNull(),
  items: text('items').notNull(), // JSON string representing products and quantities
  estimatedCost: numeric('estimated_cost').default('0').notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'confirmed', 'delivered'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define relations.
export const usersRelations = relations(users, ({ many }) => ({
  inquiries: many(inquiries),
}));

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  user: one(users, {
    fields: [inquiries.userId],
    references: [users.id],
  }),
}));
