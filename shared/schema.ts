import { sql } from "drizzle-orm";
import { pgTable, text, varchar, doublePrecision, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  whatsapp: text("whatsapp").notNull().default(""),
  document: text("document").notNull().default(""),
  email: text("email").default(""),
  cep: text("cep").notNull().default(""),
  neighborhood: text("neighborhood").notNull().default(""),
  street: text("street").notNull().default(""),
  number: text("number").notNull().default(""),
  complement: text("complement").notNull().default(""),
  city: text("city").notNull().default(""),
  uf: text("uf").notNull().default(""),
});

export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  costPerKg: doublePrecision("cost_per_kg").notNull(),
});

export const stockItems = pgTable("stock_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  materialId: text("material_id").notNull(),
  brand: text("brand").notNull().default(""),
  color: text("color").notNull().default(""),
  cost: doublePrecision("cost").notNull().default(0),
  quantity: doublePrecision("quantity").notNull().default(0),
});

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  commissionRate: doublePrecision("commission_rate").notNull().default(0),
  whatsapp: text("whatsapp").notNull().default(""),
  document: text("document").notNull().default(""),
  email: text("email").default(""),
  cep: text("cep").notNull().default(""),
  neighborhood: text("neighborhood").notNull().default(""),
  street: text("street").notNull().default(""),
  number: text("number").notNull().default(""),
  complement: text("complement").notNull().default(""),
  city: text("city").notNull().default(""),
  uf: text("uf").notNull().default(""),
  linkedUserId: text("linked_user_id"),
});

export const calculations = pgTable("calculations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  clientName: text("client_name").notNull(),
  projectName: text("project_name").notNull(),
  totalCost: doublePrecision("total_cost").notNull(),
  suggestedPrice: doublePrecision("suggested_price").notNull(),
  status: text("status").notNull().default("pending"),
  employeeId: text("employee_id"),
  employeeName: text("employee_name"),
  details: jsonb("details"),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default('default'),
  userId: text("user_id").notNull(),
  logoUrl: text("logo_url"),
  profitMargin: doublePrecision("profit_margin").notNull().default(100),
  laborCostPerHour: doublePrecision("labor_cost_per_hour").notNull().default(5),
  kwhCost: doublePrecision("kwh_cost").notNull().default(0.9),
  printerPurchasePrice: doublePrecision("printer_purchase_price").notNull().default(1200),
  printerLifespanHours: doublePrecision("printer_lifespan_hours").notNull().default(6000),
  printerPowerWatts: doublePrecision("printer_power_watts").notNull().default(150),
  selectedPrinterId: text("selected_printer_id"),
  adminWhatsapp: text("admin_whatsapp"),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  passwordHint: text("password_hint"),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  cpf: text("cpf"),
  birthdate: text("birthdate"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true });
export const insertStockItemSchema = createInsertSchema(stockItems).omit({ id: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true });
export const insertCalculationSchema = createInsertSchema(calculations).omit({ id: true });
export const insertSettingsSchema = createInsertSchema(settings);

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type StockItem = typeof stockItems.$inferSelect;
export type InsertStockItem = z.infer<typeof insertStockItemSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Calculation = typeof calculations.$inferSelect;
export type InsertCalculation = z.infer<typeof insertCalculationSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
