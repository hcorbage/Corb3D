import { sql } from "drizzle-orm";
import { pgTable, text, varchar, doublePrecision, jsonb, boolean, integer } from "drizzle-orm/pg-core";
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
  maxDiscount: doublePrecision("max_discount").notNull().default(10),
  caixaAutoOpenEnabled: boolean("caixa_auto_open_enabled").notNull().default(false),
  caixaAutoOpenTime: text("caixa_auto_open_time").default("08:00"),
  caixaAutoCloseEnabled: boolean("caixa_auto_close_enabled").notNull().default(false),
  caixaAutoCloseTime: text("caixa_auto_close_time").default("19:00"),
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

export const brands = pgTable("brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
});

export const insertBrandSchema = createInsertSchema(brands).omit({ id: true });
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = z.infer<typeof insertBrandSchema>;

export const cashEntries = pgTable("cash_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  calculationId: text("calculation_id"),
  clientName: text("client_name").notNull().default(""),
  projectName: text("project_name").notNull().default(""),
  description: text("description").notNull().default(""),
  amount: doublePrecision("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  date: text("date").notNull(),
  closingId: text("closing_id"),
  notes: text("notes").default(""),
  type: text("type").notNull().default("entrada"),
  category: text("category").notNull().default(""),
  status: text("status").notNull().default("realizado"),
  effectiveDate: text("effective_date").default(""),
  sellerUserId: text("seller_user_id"),
  sellerName: text("seller_name"),
});

export const cashClosings = pgTable("cash_closings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  periodLabel: text("period_label").notNull(),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  totalAmount: doublePrecision("total_amount").notNull(),
  entryCount: integer("entry_count").notNull().default(0),
  closedAt: text("closed_at").notNull(),
  notes: text("notes").default(""),
});

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

export const orderFinancials = pgTable("order_financials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  calculationId: text("calculation_id").notNull(),
  clientName: text("client_name").notNull().default(""),
  projectName: text("project_name").notNull().default(""),
  totalAmount: doublePrecision("total_amount").notNull(),
  amountPaid: doublePrecision("amount_paid").notNull().default(0),
  amountPending: doublePrecision("amount_pending").notNull().default(0),
  status: text("status").notNull().default("pendente"),
  paymentMethod: text("payment_method").notNull().default("pix"),
  firstPaymentDate: text("first_payment_date").default(""),
  notes: text("notes").default(""),
  createdAt: text("created_at").notNull().default(""),
  sellerUserId: text("seller_user_id"),
  sellerName: text("seller_name"),
});

export const orderPayments = pgTable("order_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  orderFinancialId: text("order_financial_id").notNull(),
  calculationId: text("calculation_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  date: text("date").notNull(),
  notes: text("notes").default(""),
  createdAt: text("created_at").notNull().default(""),
  sellerUserId: text("seller_user_id"),
  sellerName: text("seller_name"),
});

export const dailyCash = pgTable("daily_cash", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull().default("aberto"),
  openingBalance: doublePrecision("opening_balance").notNull().default(0),
  totalIn: doublePrecision("total_in").notNull().default(0),
  totalOut: doublePrecision("total_out").notNull().default(0),
  closingBalance: doublePrecision("closing_balance").notNull().default(0),
  reportedBalance: doublePrecision("reported_balance"),
  difference: doublePrecision("difference"),
  openedAt: text("opened_at").notNull().default(""),
  closedAt: text("closed_at").default(""),
  notes: text("notes").default(""),
  paymentSummary: jsonb("payment_summary"),
  openedByName: text("opened_by_name").default(""),
  closedByUserId: text("closed_by_user_id"),
  closedByName: text("closed_by_name"),
  openType: text("open_type").default("manual"),
  closeType: text("close_type"),
  reopenedByName: text("reopened_by_name"),
  reopenedAt: text("reopened_at"),
});

export const insertCashEntrySchema = createInsertSchema(cashEntries).omit({ id: true });
export const insertCashClosingSchema = createInsertSchema(cashClosings).omit({ id: true });
export const insertOrderFinancialSchema = createInsertSchema(orderFinancials).omit({ id: true });
export const insertOrderPaymentSchema = createInsertSchema(orderPayments).omit({ id: true });
export const insertDailyCashSchema = createInsertSchema(dailyCash).omit({ id: true });

export type CashEntry = typeof cashEntries.$inferSelect;
export type InsertCashEntry = z.infer<typeof insertCashEntrySchema>;
export type CashClosing = typeof cashClosings.$inferSelect;
export type InsertCashClosing = z.infer<typeof insertCashClosingSchema>;
export type OrderFinancial = typeof orderFinancials.$inferSelect;
export type InsertOrderFinancial = z.infer<typeof insertOrderFinancialSchema>;
export type OrderPayment = typeof orderPayments.$inferSelect;
export type InsertOrderPayment = z.infer<typeof insertOrderPaymentSchema>;
export type DailyCash = typeof dailyCash.$inferSelect;
export type InsertDailyCash = z.infer<typeof insertDailyCashSchema>;
