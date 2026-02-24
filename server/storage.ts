import { 
  clients, materials, stockItems, calculations, settings, users, employees,
  type Client, type InsertClient,
  type Material, type InsertMaterial,
  type StockItem, type InsertStockItem,
  type Employee, type InsertEmployee,
  type Calculation, type InsertCalculation,
  type Settings, type InsertSettings,
  type User, type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray } from "drizzle-orm";

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

  getSettings(userId: string): Promise<Settings>;
  updateSettings(userId: string, s: Partial<InsertSettings>): Promise<Settings>;

  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserCount(): Promise<number>;
  getAllUsers(): Promise<{ id: string; username: string }[]>;
  updateUserPassword(id: string, hashedPassword: string, passwordHint?: string): Promise<void>;
  setMustChangePassword(id: string, value: boolean): Promise<void>;
  deleteUser(id: string): Promise<void>;
  promoteToAdmin(id: string): Promise<void>;
  getAdminUsers(): Promise<{ id: string; username: string }[]>;
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
  async deleteUser(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.userId, id));
    await db.delete(materials).where(eq(materials.userId, id));
    await db.delete(stockItems).where(eq(stockItems.userId, id));
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
  async getAdminUsers(): Promise<{ id: string; username: string }[]> {
    return db.select({ id: users.id, username: users.username }).from(users).where(eq(users.isAdmin, true));
  }
}

export const storage = new DatabaseStorage();
