import path from "path";
import fs from "fs";
import zlib from "zlib";
import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  settings,
  materials,
  brands,
  clients,
  employees,
  calculations,
  stockItems,
  stockMovements,
  orderFinancials,
  orderPayments,
  cashEntries,
  cashClosings,
  dailyCash,
} from "@shared/schema";

const BACKUP_BASE_DIR =
  process.env.BACKUP_DIR ??
  (process.env.NODE_ENV === "production"
    ? "/var/backups/corb3dapp/companies"
    : path.join(process.cwd(), "backups", "companies"));

const SCHEMA_VERSION = "2025-04";
const KEEP_LAST = 5;

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function timestampForFilename(): string {
  return new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "Z");
}

function pruneOldBackups(dir: string, keepLast: number): void {
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json.gz"))
      .sort()
      .reverse();
    const toDelete = files.slice(keepLast);
    for (const f of toDelete) {
      fs.unlinkSync(path.join(dir, f));
    }
  } catch {
  }
}

export async function generateCompanyBackup(
  companyId: string,
  generatedBy: string
): Promise<{ filename: string; size: number }> {
  const [
    settingsData,
    materialsData,
    brandsData,
    clientsData,
    employeesData,
    calculationsData,
    stockItemsData,
    stockMovementsData,
    orderFinancialsData,
    orderPaymentsData,
    cashEntriesData,
    cashClosingsData,
    dailyCashData,
  ] = await Promise.all([
    db.select().from(settings).where(eq(settings.userId, companyId)),
    db.select().from(materials).where(eq(materials.userId, companyId)),
    db.select().from(brands).where(eq(brands.userId, companyId)),
    db.select().from(clients).where(eq(clients.userId, companyId)),
    db.select().from(employees).where(eq(employees.userId, companyId)),
    db.select().from(calculations).where(eq(calculations.userId, companyId)),
    db.select().from(stockItems).where(eq(stockItems.userId, companyId)),
    db.select().from(stockMovements).where(eq(stockMovements.userId, companyId)),
    db.select().from(orderFinancials).where(eq(orderFinancials.userId, companyId)),
    db.select().from(orderPayments).where(eq(orderPayments.userId, companyId)),
    db.select().from(cashEntries).where(eq(cashEntries.userId, companyId)),
    db.select().from(cashClosings).where(eq(cashClosings.userId, companyId)),
    db.select().from(dailyCash).where(eq(dailyCash.userId, companyId)),
  ]);

  const payload = {
    meta: {
      version: "1.0",
      schemaVersion: SCHEMA_VERSION,
      companyId,
      generatedAt: new Date().toISOString(),
      generatedBy,
    },
    data: {
      settings: settingsData,
      materials: materialsData,
      brands: brandsData,
      clients: clientsData,
      employees: employeesData,
      calculations: calculationsData,
      stock_items: stockItemsData,
      stock_movements: stockMovementsData,
      order_financials: orderFinancialsData,
      order_payments: orderPaymentsData,
      cash_entries: cashEntriesData,
      cash_closings: cashClosingsData,
      daily_cash: dailyCashData,
    },
  };

  const json = JSON.stringify(payload, null, 2);
  const compressed = zlib.gzipSync(Buffer.from(json, "utf-8"));

  const companyDir = path.join(BACKUP_BASE_DIR, companyId);
  ensureDir(companyDir);

  const ts = timestampForFilename();
  const filename = `backup_${companyId}_${ts}.json.gz`;
  const fullPath = path.join(companyDir, filename);

  fs.writeFileSync(fullPath, compressed);
  pruneOldBackups(companyDir, KEEP_LAST);

  const size = fs.statSync(fullPath).size;
  return { filename, size };
}

export function listCompanyBackups(
  companyId: string
): { filename: string; size: number; createdAt: string }[] {
  const companyDir = path.join(BACKUP_BASE_DIR, companyId);
  if (!fs.existsSync(companyDir)) return [];

  return fs
    .readdirSync(companyDir)
    .filter((f) => f.endsWith(".json.gz"))
    .sort()
    .reverse()
    .map((f) => {
      const stat = fs.statSync(path.join(companyDir, f));
      return {
        filename: f,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    });
}

export function resolveBackupPath(companyId: string, filename: string): string {
  const safeFilename = path.basename(filename);
  const fullPath = path.resolve(BACKUP_BASE_DIR, companyId, safeFilename);
  const baseResolved = path.resolve(BACKUP_BASE_DIR);
  if (!fullPath.startsWith(baseResolved + path.sep)) {
    throw new Error("Path traversal detectado.");
  }
  return fullPath;
}

export function extractCompanyIdFromFilename(filename: string): string | null {
  const safe = path.basename(filename);
  const match = safe.match(/^backup_([a-f0-9-]{36})_/);
  return match ? match[1] : null;
}

export async function restoreCompanyBackup(
  companyId: string,
  filename: string,
  performedBy: string
): Promise<{ preBackupFilename: string; tablesRestored: string[] }> {
  const safeFilename = path.basename(filename);

  const fileCompanyId = extractCompanyIdFromFilename(safeFilename);
  if (!fileCompanyId || fileCompanyId !== companyId) {
    throw new Error("Arquivo de backup não pertence a esta empresa.");
  }

  const fullPath = resolveBackupPath(companyId, safeFilename);
  if (!fs.existsSync(fullPath)) {
    throw new Error("Arquivo de backup não encontrado.");
  }

  const preBackup = await generateCompanyBackup(companyId, `pre-restore:${performedBy}`);

  const compressed = fs.readFileSync(fullPath);
  const jsonBuffer = zlib.gunzipSync(compressed);
  const payload = JSON.parse(jsonBuffer.toString("utf-8"));
  const data = payload?.data;

  if (!data || typeof data !== "object") {
    throw new Error("Arquivo de backup inválido ou corrompido.");
  }

  await db.transaction(async (tx) => {
    await tx.delete(stockMovements).where(eq(stockMovements.userId, companyId));
    await tx.delete(orderPayments).where(eq(orderPayments.userId, companyId));
    await tx.delete(cashEntries).where(eq(cashEntries.userId, companyId));
    await tx.delete(cashClosings).where(eq(cashClosings.userId, companyId));
    await tx.delete(dailyCash).where(eq(dailyCash.userId, companyId));
    await tx.delete(orderFinancials).where(eq(orderFinancials.userId, companyId));
    await tx.delete(calculations).where(eq(calculations.userId, companyId));
    await tx.delete(stockItems).where(eq(stockItems.userId, companyId));
    await tx.delete(employees).where(eq(employees.userId, companyId));
    await tx.delete(clients).where(eq(clients.userId, companyId));
    await tx.delete(materials).where(eq(materials.userId, companyId));
    await tx.delete(brands).where(eq(brands.userId, companyId));
    await tx.delete(settings).where(eq(settings.userId, companyId));

    if (Array.isArray(data.settings) && data.settings.length > 0)
      await tx.insert(settings).values(data.settings);
    if (Array.isArray(data.brands) && data.brands.length > 0)
      await tx.insert(brands).values(data.brands);
    if (Array.isArray(data.materials) && data.materials.length > 0)
      await tx.insert(materials).values(data.materials);
    if (Array.isArray(data.clients) && data.clients.length > 0)
      await tx.insert(clients).values(data.clients);
    if (Array.isArray(data.employees) && data.employees.length > 0)
      await tx.insert(employees).values(data.employees);
    if (Array.isArray(data.stock_items) && data.stock_items.length > 0)
      await tx.insert(stockItems).values(data.stock_items);
    if (Array.isArray(data.calculations) && data.calculations.length > 0)
      await tx.insert(calculations).values(data.calculations);
    if (Array.isArray(data.order_financials) && data.order_financials.length > 0)
      await tx.insert(orderFinancials).values(data.order_financials);
    if (Array.isArray(data.order_payments) && data.order_payments.length > 0)
      await tx.insert(orderPayments).values(data.order_payments);
    if (Array.isArray(data.cash_entries) && data.cash_entries.length > 0)
      await tx.insert(cashEntries).values(data.cash_entries);
    if (Array.isArray(data.cash_closings) && data.cash_closings.length > 0)
      await tx.insert(cashClosings).values(data.cash_closings);
    if (Array.isArray(data.daily_cash) && data.daily_cash.length > 0)
      await tx.insert(dailyCash).values(data.daily_cash);
    if (Array.isArray(data.stock_movements) && data.stock_movements.length > 0)
      await tx.insert(stockMovements).values(data.stock_movements);
  });

  return {
    preBackupFilename: preBackup.filename,
    tablesRestored: [
      "settings", "brands", "materials", "clients", "employees",
      "stock_items", "calculations", "order_financials", "order_payments",
      "cash_entries", "cash_closings", "daily_cash", "stock_movements",
    ],
  };
}
