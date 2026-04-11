import { 
  clients, materials, stockItems, stockMovements, calculations, settings, users, employees, brands, cashEntries, cashClosings,
  orderFinancials, orderPayments, dailyCash, userPermissions, auditLogs, passwordResetTokens, customPrinters, emailVerificationTokens,
  type Client, type InsertClient,
  type Material, type InsertMaterial,
  type StockItem, type InsertStockItem,
  type StockMovement, type InsertStockMovement,
  type Employee, type InsertEmployee,
  type Calculation, type InsertCalculation,
  type Settings, type InsertSettings,
  type User, type InsertUser,
  type Brand, type InsertBrand,
  type CashEntry, type InsertCashEntry,
  type CashClosing, type InsertCashClosing,
  type OrderFinancial, type InsertOrderFinancial,
  type OrderPayment, type InsertOrderPayment,
  type DailyCash, type InsertDailyCash,
  type AuditLog,
  type CustomPrinter, type InsertCustomPrinter,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ne, inArray, sql } from "drizzle-orm";

export type ClientFinancialSummary = {
  clientName: string;
  qtdPedidos: number;
  totalComprado: number;
  totalPago: number;
  totalPendente: number;
  aFaturar: number;
  pendenteNaoFaturar: number;
  temVencido: boolean;
  ultimoPedido: string;
};

export interface IStorage {
  getClients(userId: string): Promise<Client[]>;
  getClient(id: string, userId: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, userId: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string, userId: string): Promise<void>;

  getMaterials(userId: string): Promise<Material[]>;
  getMaterial(id: string, userId: string): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: string, userId: string, material: Partial<InsertMaterial>): Promise<Material | undefined>;
  deleteMaterial(id: string, userId: string): Promise<void>;
  getMaterialCount(userId: string): Promise<number>;

  getStockItems(userId: string): Promise<StockItem[]>;
  getStockItem(id: string, userId: string): Promise<StockItem | undefined>;
  createStockItem(item: InsertStockItem): Promise<StockItem>;
  updateStockItem(id: string, userId: string, item: Partial<InsertStockItem>): Promise<StockItem | undefined>;
  deleteStockItem(id: string, userId: string): Promise<void>;

  getStockMovements(userId: string, stockItemId?: string): Promise<StockMovement[]>;
  createStockMovement(userId: string, stockItemId: string, type: string, quantity: number, date: string, notes: string, triggeredBy: string, calculationId?: string): Promise<{ movement: StockMovement; stockItem: StockItem }>;

  getEmployees(userId: string): Promise<Employee[]>;
  getEmployeeByLinkedUserId(linkedUserId: string): Promise<Employee | undefined>;
  getEmployee(id: string, userId: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, userId: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: string, userId: string): Promise<void>;

  getCalculations(userId: string): Promise<Calculation[]>;
  getCalculation(id: string, userId: string): Promise<Calculation | undefined>;
  createCalculation(calc: InsertCalculation): Promise<Calculation>;
  updateCalculation(id: string, userId: string, calc: Partial<InsertCalculation>): Promise<Calculation | undefined>;
  deleteCalculation(id: string, userId: string): Promise<void>;

  getBrands(userId: string): Promise<Brand[]>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  deleteBrand(id: string, userId: string): Promise<void>;
  getBrandCount(userId: string): Promise<number>;

  getSettings(userId: string): Promise<Settings>;
  updateSettings(userId: string, s: Partial<InsertSettings>): Promise<Settings>;

  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByCpf(cpf: string): Promise<User | undefined>;
  updateUserEmail(id: string, email: string): Promise<void>;
  createEmailVerifToken(email: string, tokenHash: string, expiresAt: string, formData: string): Promise<{ id: string }>;
  getEmailVerifToken(id: string): Promise<{ id: string; email: string; tokenHash: string; expiresAt: string; attempts: number; formData: string } | undefined>;
  incrementEmailVerifAttempts(id: string): Promise<void>;
  deleteEmailVerifToken(id: string): Promise<void>;
  deleteExpiredEmailVerifTokens(): Promise<void>;
  createResetToken(userId: string, tokenHash: string, expiresAt: string): Promise<void>;
  getValidResetToken(tokenHash: string): Promise<{ id: string; userId: string; expiresAt: string } | undefined>;
  markResetTokenUsed(id: string): Promise<void>;
  deleteExpiredResetTokens(): Promise<void>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByRole(role: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserCount(): Promise<number>;
  getAllUsers(): Promise<{ id: string; username: string }[]>;
  updateUserPassword(id: string, hashedPassword: string, passwordHint?: string): Promise<void>;
  updateUsername(id: string, username: string): Promise<void>;
  setMustChangePassword(id: string, value: boolean): Promise<void>;
  deleteUser(id: string): Promise<void>;
  promoteToAdmin(id: string): Promise<void>;
  getAdminUsers(): Promise<{ id: string; username: string; role: string; trial: boolean | null; trialStartedAt: string | null; trialEndsAt: string | null; accessStatus: string | null; mustChangePassword: boolean; email: string | null }[]>;
  updateUserAccessStatus(id: string, accessStatus: string, trialEndsAt?: string | null): Promise<void>;
  acceptTerms(id: string, version: string, ip: string): Promise<void>;

  getCashEntries(userId: string): Promise<CashEntry[]>;
  createCashEntry(entry: InsertCashEntry): Promise<CashEntry>;
  updateCashEntry(id: string, userId: string, entry: Partial<InsertCashEntry>): Promise<CashEntry | undefined>;
  deleteCashEntry(id: string, userId: string): Promise<void>;

  getCashClosings(userId: string): Promise<CashClosing[]>;
  createCashClosing(closing: InsertCashClosing): Promise<CashClosing>;
  closeEntries(userId: string, closingId: string, entryIds: string[]): Promise<void>;

  // Order Financials
  getOrderFinancials(userId: string): Promise<OrderFinancial[]>;
  getOrderFinancialByCalculationId(calculationId: string, userId: string): Promise<OrderFinancial | undefined>;
  createOrderFinancial(of: InsertOrderFinancial): Promise<OrderFinancial>;
  updateOrderFinancial(id: string, userId: string, data: Partial<InsertOrderFinancial>): Promise<OrderFinancial | undefined>;
  getClientFinancialsSummary(userId: string): Promise<ClientFinancialSummary[]>;

  // Order Payments
  getOrderPayments(userId: string, orderFinancialId: string): Promise<OrderPayment[]>;
  getOrderPaymentById(id: string): Promise<OrderPayment | undefined>;
  createOrderPayment(op: InsertOrderPayment): Promise<OrderPayment>;
  deleteOrderPayment(id: string, userId: string): Promise<void>;
  deleteCashEntryByPayment(calculationId: string, amount: number, date: string, userId: string): Promise<void>;

  // Daily Cash
  getDailyCashList(userId: string): Promise<DailyCash[]>;
  getTodayDailyCash(userId: string, date: string): Promise<DailyCash | undefined>;
  getAnyOpenDailyCash(): Promise<{ id: string; userId: string; openingBalance: number; openedByName?: string | null } | undefined>;
  createDailyCash(dc: InsertDailyCash): Promise<DailyCash>;
  updateDailyCash(id: string, userId: string, data: Partial<InsertDailyCash>): Promise<DailyCash | undefined>;

  // Permissions
  getUserPermissions(userId: string): Promise<string[]>;
  setUserPermissions(userId: string, modules: string[]): Promise<void>;
  updateUserRoleAndCompany(id: string, role: string, companyId?: string | null): Promise<void>;

  // Reset
  resetCompanyData(userId: string): Promise<void>;
  resetAllCompaniesData(masterAdminId: string): Promise<void>;
  resetSelectiveData(modules: string[], masterAdminId: string): Promise<void>;
  resetFinancialData(userId: string): Promise<void>;

  // Permanent company deletion (super_admin only)
  deleteCompanyPermanently(companyId: string): Promise<void>;

  // Audit
  createAuditLog(entry: { executedByUserId: string; executedByUsername: string; action: string; targetUserId?: string; targetUsername?: string; details?: string; ipAddress?: string; userAgent?: string }): Promise<AuditLog>;
  getAuditLogs(): Promise<AuditLog[]>;

  // Custom Printers
  getCustomPrinters(userId: string): Promise<CustomPrinter[]>;
  createCustomPrinter(data: InsertCustomPrinter): Promise<CustomPrinter>;
  deleteCustomPrinter(id: number, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getClients(userId: string): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.userId, userId));
  }
  async getClient(id: string, userId: string): Promise<Client | undefined> {
    const [c] = await db.select().from(clients).where(and(eq(clients.id, id), eq(clients.userId, userId)));
    return c;
  }
  async createClient(client: InsertClient): Promise<Client> {
    const [c] = await db.insert(clients).values(client).returning();
    return c;
  }
  async updateClient(id: string, userId: string, client: Partial<InsertClient>): Promise<Client | undefined> {
    const [c] = await db.update(clients).set(client).where(and(eq(clients.id, id), eq(clients.userId, userId))).returning();
    return c;
  }
  async deleteClient(id: string, userId: string): Promise<void> {
    await db.delete(clients).where(and(eq(clients.id, id), eq(clients.userId, userId)));
  }

  async getMaterials(userId: string): Promise<Material[]> {
    return db.select().from(materials).where(eq(materials.userId, userId));
  }
  async getMaterial(id: string, userId: string): Promise<Material | undefined> {
    const [m] = await db.select().from(materials).where(and(eq(materials.id, id), eq(materials.userId, userId)));
    return m;
  }
  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [m] = await db.insert(materials).values(material).returning();
    return m;
  }
  async updateMaterial(id: string, userId: string, material: Partial<InsertMaterial>): Promise<Material | undefined> {
    const [m] = await db.update(materials).set(material).where(and(eq(materials.id, id), eq(materials.userId, userId))).returning();
    return m;
  }
  async deleteMaterial(id: string, userId: string): Promise<void> {
    await db.delete(materials).where(and(eq(materials.id, id), eq(materials.userId, userId)));
  }
  async getMaterialCount(userId: string): Promise<number> {
    const result = await db.select().from(materials).where(eq(materials.userId, userId));
    return result.length;
  }

  async getStockItems(userId: string): Promise<StockItem[]> {
    return db.select().from(stockItems).where(eq(stockItems.userId, userId));
  }
  async getStockItem(id: string, userId: string): Promise<StockItem | undefined> {
    const [s] = await db.select().from(stockItems).where(and(eq(stockItems.id, id), eq(stockItems.userId, userId)));
    return s;
  }
  async createStockItem(item: InsertStockItem): Promise<StockItem> {
    const [s] = await db.insert(stockItems).values(item).returning();
    return s;
  }
  async updateStockItem(id: string, userId: string, item: Partial<InsertStockItem>): Promise<StockItem | undefined> {
    const [s] = await db.update(stockItems).set(item).where(and(eq(stockItems.id, id), eq(stockItems.userId, userId))).returning();
    return s;
  }
  async deleteStockItem(id: string, userId: string): Promise<void> {
    await db.delete(stockItems).where(and(eq(stockItems.id, id), eq(stockItems.userId, userId)));
  }

  async getStockMovements(userId: string, stockItemId?: string): Promise<StockMovement[]> {
    if (stockItemId) {
      return db.select().from(stockMovements)
        .where(and(eq(stockMovements.userId, userId), eq(stockMovements.stockItemId, stockItemId)))
        .orderBy(sql`${stockMovements.createdAt} DESC`);
    }
    return db.select().from(stockMovements)
      .where(eq(stockMovements.userId, userId))
      .orderBy(sql`${stockMovements.createdAt} DESC`);
  }

  async createStockMovement(
    userId: string, stockItemId: string, type: string, quantity: number,
    date: string, notes: string, triggeredBy: string, calculationId?: string
  ): Promise<{ movement: StockMovement; stockItem: StockItem }> {
    const [current] = await db.select().from(stockItems).where(and(eq(stockItems.id, stockItemId), eq(stockItems.userId, userId)));
    if (!current) throw new Error("Item de estoque não encontrado");

    const previousQuantity = current.quantity;
    let newQuantity: number;
    if (type === "entrada") {
      newQuantity = previousQuantity + quantity;
    } else if (type === "saida") {
      newQuantity = previousQuantity - quantity;
    } else {
      newQuantity = quantity;
    }

    const createdAt = new Date().toISOString();
    const [movement] = await db.insert(stockMovements).values({
      userId, stockItemId, type, quantity, previousQuantity, newQuantity,
      date, notes: notes || "", triggeredBy, calculationId: calculationId || null, createdAt,
    }).returning();

    const [updatedItem] = await db.update(stockItems)
      .set({ quantity: newQuantity })
      .where(and(eq(stockItems.id, stockItemId), eq(stockItems.userId, userId)))
      .returning();

    return { movement, stockItem: updatedItem };
  }

  async getEmployees(userId: string): Promise<Employee[]> {
    return db.select().from(employees).where(eq(employees.userId, userId));
  }
  async getEmployeeByLinkedUserId(linkedUserId: string): Promise<Employee | undefined> {
    const [e] = await db.select().from(employees).where(eq(employees.linkedUserId, linkedUserId));
    return e;
  }
  async getCalculationsForUserIds(userIds: string[]): Promise<Calculation[]> {
    if (userIds.length === 0) return [];
    return db.select().from(calculations).where(inArray(calculations.userId, userIds));
  }
  async getEmployee(id: string, userId: string): Promise<Employee | undefined> {
    const [e] = await db.select().from(employees).where(and(eq(employees.id, id), eq(employees.userId, userId)));
    return e;
  }
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [e] = await db.insert(employees).values(employee).returning();
    return e;
  }
  async updateEmployee(id: string, userId: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [e] = await db.update(employees).set(employee).where(and(eq(employees.id, id), eq(employees.userId, userId))).returning();
    return e;
  }
  async deleteEmployee(id: string, userId: string): Promise<void> {
    await db.delete(employees).where(and(eq(employees.id, id), eq(employees.userId, userId)));
  }

  async getCalculations(userId: string): Promise<Calculation[]> {
    return db.select().from(calculations).where(eq(calculations.userId, userId));
  }
  async getCalculation(id: string, userId: string): Promise<Calculation | undefined> {
    const [c] = await db.select().from(calculations).where(and(eq(calculations.id, id), eq(calculations.userId, userId)));
    return c;
  }
  async createCalculation(calc: InsertCalculation): Promise<Calculation> {
    const [c] = await db.insert(calculations).values(calc).returning();
    return c;
  }
  async updateCalculation(id: string, userId: string, calc: Partial<InsertCalculation>): Promise<Calculation | undefined> {
    const [c] = await db.update(calculations).set(calc).where(and(eq(calculations.id, id), eq(calculations.userId, userId))).returning();
    return c;
  }
  async deleteCalculation(id: string, userId: string): Promise<void> {
    await db.delete(calculations).where(and(eq(calculations.id, id), eq(calculations.userId, userId)));
  }

  async getBrands(userId: string): Promise<Brand[]> {
    return db.select().from(brands).where(eq(brands.userId, userId));
  }
  async createBrand(brand: InsertBrand): Promise<Brand> {
    const [b] = await db.insert(brands).values(brand).returning();
    return b;
  }
  async deleteBrand(id: string, userId: string): Promise<void> {
    await db.delete(brands).where(and(eq(brands.id, id), eq(brands.userId, userId)));
  }
  async getBrandCount(userId: string): Promise<number> {
    const result = await db.select().from(brands).where(eq(brands.userId, userId));
    return result.length;
  }

  async getSettings(userId: string): Promise<Settings> {
    const [s] = await db.select().from(settings).where(eq(settings.userId, userId));
    if (!s) {
      const [created] = await db.insert(settings).values({ id: userId, userId }).returning();
      return created;
    }
    return s;
  }
  async updateSettings(userId: string, s: Partial<InsertSettings>): Promise<Settings> {
    await this.getSettings(userId);
    const [updated] = await db.update(settings).set(s).where(eq(settings.userId, userId)).returning();
    return updated;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.username, username));
    return u;
  }
  async getUserById(id: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u;
  }
  async getUserByRole(role: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.role as any, role));
    return u;
  }
  async createUser(user: InsertUser): Promise<User> {
    const [u] = await db.insert(users).values(user).returning();
    return u;
  }
  async getUserCount(): Promise<number> {
    const result = await db.select().from(users);
    return result.length;
  }
  async getAllUsers(): Promise<{ id: string; username: string }[]> {
    const result = await db.select({ id: users.id, username: users.username }).from(users);
    return result;
  }
  async updateUserPassword(id: string, hashedPassword: string, passwordHint?: string): Promise<void> {
    const updateData: any = { password: hashedPassword };
    if (passwordHint !== undefined) {
      updateData.passwordHint = passwordHint;
    }
    await db.update(users).set(updateData).where(eq(users.id, id));
  }
  async updateUsername(id: string, username: string): Promise<void> {
    await db.update(users).set({ username }).where(eq(users.id, id));
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async getUserByCpf(cpf: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.cpf, cpf));
    return user;
  }
  async updateUserEmail(id: string, email: string): Promise<void> {
    await db.update(users).set({ email }).where(eq(users.id, id));
  }
  async createResetToken(userId: string, tokenHash: string, expiresAt: string): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await db.insert(passwordResetTokens).values({
      userId,
      tokenHash,
      expiresAt,
      createdAt: new Date().toISOString(),
    });
  }
  async getValidResetToken(tokenHash: string): Promise<{ id: string; userId: string; expiresAt: string } | undefined> {
    const [row] = await db.select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          sql`${passwordResetTokens.usedAt} IS NULL`
        )
      );
    return row ? { id: row.id, userId: row.userId, expiresAt: row.expiresAt } : undefined;
  }
  async markResetTokenUsed(id: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date().toISOString() })
      .where(eq(passwordResetTokens.id, id));
  }
  async deleteExpiredResetTokens(): Promise<void> {
    await db.delete(passwordResetTokens)
      .where(sql`${passwordResetTokens.expiresAt} < ${new Date().toISOString()}`);
  }
  async createEmailVerifToken(email: string, tokenHash: string, expiresAt: string, formData: string): Promise<{ id: string }> {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.email, email));
    const [row] = await db.insert(emailVerificationTokens).values({
      email,
      tokenHash,
      expiresAt,
      attempts: 0,
      formData,
      createdAt: new Date().toISOString(),
    }).returning({ id: emailVerificationTokens.id });
    return row;
  }
  async getEmailVerifToken(id: string): Promise<{ id: string; email: string; tokenHash: string; expiresAt: string; attempts: number; formData: string } | undefined> {
    const [row] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.id, id));
    return row ? { id: row.id, email: row.email, tokenHash: row.tokenHash, expiresAt: row.expiresAt, attempts: row.attempts, formData: row.formData } : undefined;
  }
  async incrementEmailVerifAttempts(id: string): Promise<void> {
    await db.update(emailVerificationTokens)
      .set({ attempts: sql`${emailVerificationTokens.attempts} + 1` })
      .where(eq(emailVerificationTokens.id, id));
  }
  async deleteEmailVerifToken(id: string): Promise<void> {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, id));
  }
  async deleteExpiredEmailVerifTokens(): Promise<void> {
    await db.delete(emailVerificationTokens)
      .where(sql`${emailVerificationTokens.expiresAt} < ${new Date().toISOString()}`);
  }
  async deleteUser(id: string): Promise<void> {
    const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, id));
    if (target?.role === "company_admin") {
      throw new Error("COMPANY_ADMIN_PROTECTED: conta principal da empresa não pode ser excluída.");
    }
    const emps = await db.select().from(employees).where(eq(employees.userId, id));
    for (const emp of emps) {
      if (emp.linkedUserId) {
        await db.delete(calculations).where(eq(calculations.userId, emp.linkedUserId));
        await db.delete(materials).where(eq(materials.userId, emp.linkedUserId));
        await db.delete(settings).where(eq(settings.userId, emp.linkedUserId));
        await db.delete(users).where(eq(users.id, emp.linkedUserId));
      }
    }
    await db.delete(clients).where(eq(clients.userId, id));
    await db.delete(materials).where(eq(materials.userId, id));
    await db.delete(stockItems).where(eq(stockItems.userId, id));
    await db.delete(brands).where(eq(brands.userId, id));
    await db.delete(employees).where(eq(employees.userId, id));
    await db.delete(calculations).where(eq(calculations.userId, id));
    await db.delete(settings).where(eq(settings.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }
  async setMustChangePassword(id: string, value: boolean): Promise<void> {
    await db.update(users).set({ mustChangePassword: value }).where(eq(users.id, id));
  }
  async promoteToAdmin(id: string): Promise<void> {
    await db.update(users).set({ isAdmin: true }).where(eq(users.id, id));
  }
  async getAdminUsers(): Promise<{ id: string; username: string; role: string; trial: boolean | null; trialStartedAt: string | null; trialEndsAt: string | null; accessStatus: string | null; mustChangePassword: boolean; email: string | null }[]> {
    return db.select({
      id: users.id,
      username: users.username,
      role: users.role,
      trial: users.trial,
      trialStartedAt: users.trialStartedAt,
      trialEndsAt: users.trialEndsAt,
      accessStatus: users.accessStatus,
      mustChangePassword: users.mustChangePassword,
      email: users.email,
    }).from(users).where(and(eq(users.isAdmin, true), ne(users.role, "super_admin" as any)));
  }

  async updateUserAccessStatus(id: string, accessStatus: string, trialEndsAt?: string | null): Promise<void> {
    const updateData: any = { accessStatus };
    if (accessStatus === "full" || accessStatus === "blocked") {
      updateData.trial = false;
    }
    if (trialEndsAt !== undefined) updateData.trialEndsAt = trialEndsAt;
    await db.update(users).set(updateData).where(eq(users.id, id));
  }

  async acceptTerms(id: string, version: string, ip: string): Promise<void> {
    const now = new Date().toISOString();
    await db.update(users).set({
      acceptedTerms: true,
      acceptedTermsAt: now,
      acceptedTermsVersion: version,
      acceptedPrivacy: true,
      acceptedPrivacyAt: now,
      acceptedIp: ip,
    }).where(eq(users.id, id));
  }

  async getCashEntries(userId: string): Promise<CashEntry[]> {
    return db.select().from(cashEntries).where(eq(cashEntries.userId, userId));
  }
  async createCashEntry(entry: InsertCashEntry): Promise<CashEntry> {
    const [e] = await db.insert(cashEntries).values(entry).returning();
    return e;
  }
  async updateCashEntry(id: string, userId: string, entry: Partial<InsertCashEntry>): Promise<CashEntry | undefined> {
    const [e] = await db.update(cashEntries).set(entry).where(and(eq(cashEntries.id, id), eq(cashEntries.userId, userId))).returning();
    return e;
  }
  async deleteCashEntry(id: string, userId: string): Promise<void> {
    await db.delete(cashEntries).where(and(eq(cashEntries.id, id), eq(cashEntries.userId, userId)));
  }

  async getCashClosings(userId: string): Promise<CashClosing[]> {
    return db.select().from(cashClosings).where(eq(cashClosings.userId, userId));
  }
  async createCashClosing(closing: InsertCashClosing): Promise<CashClosing> {
    const [c] = await db.insert(cashClosings).values(closing).returning();
    return c;
  }
  async closeEntries(userId: string, closingId: string, entryIds: string[]): Promise<void> {
    if (entryIds.length === 0) return;
    await db.update(cashEntries)
      .set({ closingId })
      .where(and(eq(cashEntries.userId, userId), inArray(cashEntries.id, entryIds)));
  }

  // Order Financials
  async getOrderFinancials(userId: string): Promise<OrderFinancial[]> {
    return db.select().from(orderFinancials).where(eq(orderFinancials.userId, userId));
  }
  async getOrderFinancialByCalculationId(calculationId: string, userId: string): Promise<OrderFinancial | undefined> {
    // Search globally by calculationId (since records may be under cash owner's userId)
    const [r] = await db.select().from(orderFinancials).where(eq(orderFinancials.calculationId, calculationId));
    return r;
  }

  async getAnyOpenDailyCash(): Promise<{ id: string; userId: string; openingBalance: number; openedByName?: string | null } | undefined> {
    const today = new Date().toISOString().slice(0, 10);
    const [r] = await db.select({ id: dailyCash.id, userId: dailyCash.userId, openingBalance: dailyCash.openingBalance, openedByName: dailyCash.openedByName })
      .from(dailyCash)
      .where(and(eq(dailyCash.status, "aberto"), eq(dailyCash.date, today)));
    return r;
  }
  async createOrderFinancial(of: InsertOrderFinancial): Promise<OrderFinancial> {
    const [r] = await db.insert(orderFinancials).values(of).returning();
    return r;
  }
  async updateOrderFinancial(id: string, userId: string, data: Partial<InsertOrderFinancial>): Promise<OrderFinancial | undefined> {
    const [r] = await db.update(orderFinancials).set(data).where(and(eq(orderFinancials.id, id), eq(orderFinancials.userId, userId))).returning();
    return r;
  }

  async getClientFinancialsSummary(userId: string): Promise<ClientFinancialSummary[]> {
    const rows = await db.execute(sql`
      SELECT
        client_name                                                                                  AS "clientName",
        COUNT(*)::int                                                                                AS "qtdPedidos",
        COALESCE(SUM(total_amount), 0)::float                                                       AS "totalComprado",
        COALESCE(SUM(amount_paid), 0)::float                                                        AS "totalPago",
        COALESCE(SUM(amount_pending), 0)::float                                                     AS "totalPendente",
        COALESCE(SUM(CASE WHEN payment_method = 'a_faturar' THEN amount_pending ELSE 0 END), 0)::float  AS "aFaturar",
        COALESCE(SUM(CASE WHEN payment_method != 'a_faturar' THEN amount_pending ELSE 0 END), 0)::float AS "pendenteNaoFaturar",
        BOOL_OR(payment_method = 'a_faturar' AND status != 'pago' AND due_date IS NOT NULL AND due_date < CURRENT_DATE) AS "temVencido",
        MAX(created_at)                                                                             AS "ultimoPedido"
      FROM order_financials
      WHERE user_id = ${userId}
        AND status != 'cancelado'
        AND client_name != ''
      GROUP BY client_name
      ORDER BY SUM(total_amount) DESC
    `);
    return rows.rows as ClientFinancialSummary[];
  }

  // Order Payments
  async getOrderPayments(userId: string, orderFinancialId: string): Promise<OrderPayment[]> {
    return db.select().from(orderPayments).where(and(eq(orderPayments.userId, userId), eq(orderPayments.orderFinancialId, orderFinancialId)));
  }
  async createOrderPayment(op: InsertOrderPayment): Promise<OrderPayment> {
    const [r] = await db.insert(orderPayments).values(op).returning();
    return r;
  }
  async getOrderPaymentById(id: string): Promise<OrderPayment | undefined> {
    const [r] = await db.select().from(orderPayments).where(eq(orderPayments.id, id));
    return r;
  }
  async deleteOrderPayment(id: string, userId: string): Promise<void> {
    await db.delete(orderPayments).where(and(eq(orderPayments.id, id), eq(orderPayments.userId, userId)));
  }
  async deleteCashEntryByPayment(calculationId: string, amount: number, date: string, userId: string): Promise<void> {
    const matches = await db.select().from(cashEntries).where(
      and(
        eq(cashEntries.userId, userId),
        eq(cashEntries.calculationId, calculationId),
        eq(cashEntries.amount, amount),
        eq(cashEntries.date, date),
        eq(cashEntries.type, "entrada"),
        eq(cashEntries.category, "venda de pedido")
      )
    );
    if (matches.length > 0) {
      await db.delete(cashEntries).where(eq(cashEntries.id, matches[0].id));
    }
  }

  // Daily Cash
  async getDailyCashList(userId: string): Promise<DailyCash[]> {
    return db.select().from(dailyCash).where(eq(dailyCash.userId, userId));
  }
  async getTodayDailyCash(userId: string, date: string): Promise<DailyCash | undefined> {
    const [r] = await db.select().from(dailyCash).where(and(eq(dailyCash.userId, userId), eq(dailyCash.date, date)));
    return r;
  }
  async createDailyCash(dc: InsertDailyCash): Promise<DailyCash> {
    const [r] = await db.insert(dailyCash).values(dc).returning();
    return r;
  }
  async updateDailyCash(id: string, userId: string, data: Partial<InsertDailyCash>): Promise<DailyCash | undefined> {
    const [r] = await db.update(dailyCash).set(data).where(and(eq(dailyCash.id, id), eq(dailyCash.userId, userId))).returning();
    return r;
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const perms = await db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
    return perms.map(p => p.module);
  }

  async setUserPermissions(userId: string, modules: string[]): Promise<void> {
    await db.delete(userPermissions).where(eq(userPermissions.userId, userId));
    if (modules.length > 0) {
      await db.insert(userPermissions).values(modules.map(module => ({ userId, module })));
    }
  }

  async updateUserRoleAndCompany(id: string, role: string, companyId?: string | null): Promise<void> {
    const update: any = { role };
    if (companyId !== undefined) update.companyId = companyId;
    await db.update(users).set(update).where(eq(users.id, id));
  }

  async resetCompanyData(userId: string): Promise<void> {
    // Find all employee linked user IDs before deleting employees
    const emps = await db.select({ linkedUserId: employees.linkedUserId }).from(employees).where(eq(employees.userId, userId));
    const linkedUserIds = emps.map(e => e.linkedUserId).filter(Boolean) as string[];

    await db.delete(orderPayments).where(eq(orderPayments.userId, userId));
    await db.delete(orderFinancials).where(eq(orderFinancials.userId, userId));
    await db.delete(cashEntries).where(eq(cashEntries.userId, userId));
    await db.delete(cashClosings).where(eq(cashClosings.userId, userId));
    await db.delete(dailyCash).where(eq(dailyCash.userId, userId));
    await db.delete(stockMovements).where(eq(stockMovements.userId, userId));
    await db.delete(stockItems).where(eq(stockItems.userId, userId));
    await db.delete(calculations).where(eq(calculations.userId, userId));
    await db.delete(clients).where(eq(clients.userId, userId));
    await db.delete(materials).where(eq(materials.userId, userId));
    await db.delete(brands).where(eq(brands.userId, userId));
    await db.delete(employees).where(eq(employees.userId, userId));
    // NOTE: settings are preserved — reset is NOT account deletion

    // Delete linked employee user accounts and their permissions
    if (linkedUserIds.length > 0) {
      await db.delete(userPermissions).where(inArray(userPermissions.userId, linkedUserIds));
      await db.delete(users).where(inArray(users.id, linkedUserIds));
    }
  }

  async resetAllCompaniesData(masterAdminId: string): Promise<void> {
    const allAdminUsers = await db.select({ id: users.id }).from(users).where(
      and(ne(users.id, masterAdminId), eq(users.role, "company_admin"))
    );
    for (const u of allAdminUsers) {
      await this.resetCompanyData(u.id);
    }
  }

  /**
   * Exclusão DEFINITIVA de empresa.
   * Remove todos os dados operacionais + contas de acesso (company_admin + employees).
   * Deve ser chamado APÓS gerar backups por empresa e global administrativo.
   */
  async deleteCompanyPermanently(companyId: string): Promise<void> {
    // 1. resetCompanyData: apaga as 13 tabelas operacionais + users/permissions dos employees
    await this.resetCompanyData(companyId);

    // 2. Apaga permissões do company_admin
    await db.delete(userPermissions).where(eq(userPermissions.userId, companyId));

    // 3. Apaga password reset tokens do company_admin (se existirem)
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, companyId));

    // 4. Apaga o próprio company_admin da tabela users
    await db.delete(users).where(eq(users.id, companyId));

    console.log(`[DeleteCompany] Empresa excluída definitivamente: ${companyId}`);
  }

  async resetSelectiveData(modules: string[], masterAdminId: string): Promise<void> {
    const all = modules.includes("all");

    // All company_admin IDs (never touches super_admin)
    const adminUsers = await db.select({ id: users.id }).from(users).where(
      and(ne(users.id, masterAdminId), eq(users.role, "company_admin"))
    );
    const adminIds = adminUsers.map(u => u.id);

    // Deletion order: dependents first to avoid FK issues
    if ((all || modules.includes("payments")) && adminIds.length > 0)
      await db.delete(orderPayments).where(inArray(orderPayments.userId, adminIds));

    if ((all || modules.includes("orderFinancials")) && adminIds.length > 0)
      await db.delete(orderFinancials).where(inArray(orderFinancials.userId, adminIds));

    if ((all || modules.includes("cashEntries")) && adminIds.length > 0)
      await db.delete(cashEntries).where(inArray(cashEntries.userId, adminIds));

    if ((all || modules.includes("cashClosings")) && adminIds.length > 0)
      await db.delete(cashClosings).where(inArray(cashClosings.userId, adminIds));

    if ((all || modules.includes("dailyCash")) && adminIds.length > 0)
      await db.delete(dailyCash).where(inArray(dailyCash.userId, adminIds));

    if ((all || modules.includes("stock")) && adminIds.length > 0) {
      await db.delete(stockMovements).where(inArray(stockMovements.userId, adminIds));
      await db.delete(stockItems).where(inArray(stockItems.userId, adminIds));
      await db.delete(materials).where(inArray(materials.userId, adminIds));
      await db.delete(brands).where(inArray(brands.userId, adminIds));
    }

    if ((all || modules.includes("orders")) && adminIds.length > 0)
      await db.delete(calculations).where(inArray(calculations.userId, adminIds));

    if ((all || modules.includes("clients")) && adminIds.length > 0)
      await db.delete(clients).where(inArray(clients.userId, adminIds));

    if ((all || modules.includes("employees")) && adminIds.length > 0) {
      const emps = await db.select({ linkedUserId: employees.linkedUserId })
        .from(employees)
        .where(inArray(employees.userId, adminIds));
      const linkedUserIds = emps.map(e => e.linkedUserId).filter(Boolean) as string[];
      await db.delete(employees).where(inArray(employees.userId, adminIds));
      if (linkedUserIds.length > 0) {
        await db.delete(userPermissions).where(inArray(userPermissions.userId, linkedUserIds));
        await db.delete(users).where(inArray(users.id, linkedUserIds));
      }
    }

    if ((all || modules.includes("permissions")) && adminIds.length > 0)
      await db.delete(userPermissions).where(inArray(userPermissions.userId, adminIds));

    // Delete company_admin accounts (NEVER super_admin)
    if ((all || modules.includes("adminAccounts")) && adminIds.length > 0) {
      await db.delete(userPermissions).where(inArray(userPermissions.userId, adminIds));
      await db.delete(users).where(inArray(users.id, adminIds));
    }
  }

  async resetFinancialData(userId: string): Promise<void> {
    // Delete in dependency order (payments/entries before parents)
    await db.delete(orderPayments).where(eq(orderPayments.userId, userId));
    await db.delete(orderFinancials).where(eq(orderFinancials.userId, userId));
    await db.delete(cashEntries).where(eq(cashEntries.userId, userId));
    await db.delete(cashClosings).where(eq(cashClosings.userId, userId));
    await db.delete(dailyCash).where(eq(dailyCash.userId, userId));
  }

  async createAuditLog(entry: { executedByUserId: string; executedByUsername: string; action: string; targetUserId?: string; targetUsername?: string; details?: string; ipAddress?: string; userAgent?: string }): Promise<AuditLog> {
    const [row] = await db.insert(auditLogs).values({
      executedByUserId: entry.executedByUserId,
      executedByUsername: entry.executedByUsername,
      action: entry.action,
      targetUserId: entry.targetUserId ?? null,
      targetUsername: entry.targetUsername ?? null,
      details: entry.details ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      createdAt: new Date().toISOString(),
    }).returning();
    return row;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(sql`created_at DESC`);
  }

  async getCustomPrinters(userId: string): Promise<CustomPrinter[]> {
    return db.select().from(customPrinters).where(eq(customPrinters.userId, userId));
  }

  async createCustomPrinter(data: InsertCustomPrinter): Promise<CustomPrinter> {
    const [row] = await db.insert(customPrinters).values(data).returning();
    return row;
  }

  async deleteCustomPrinter(id: number, userId: string): Promise<void> {
    await db.delete(customPrinters).where(and(eq(customPrinters.id, id), eq(customPrinters.userId, userId)));
  }
}

export const storage = new DatabaseStorage();
