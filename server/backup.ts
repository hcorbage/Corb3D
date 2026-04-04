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
