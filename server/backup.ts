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

async function executeRestoreFromData(
  companyId: string,
  data: Record<string, any[]>,
  performedBy: string,
  source: string
): Promise<{ preBackupFilename: string; stats: Record<string, { deleted: number; inserted: number }> }> {
  console.log(`[Restore] INÍCIO — empresa: ${companyId} | por: ${performedBy} | fonte: ${source}`);

  const preBackup = await generateCompanyBackup(companyId, `pre-restore:${performedBy}`);
  console.log(`[Restore] Pré-backup criado: ${preBackup.filename}`);

  const stats: Record<string, { deleted: number; inserted: number }> = {};

  await db.transaction(async (tx) => {
    const del = async (table: any, col: any, label: string) => {
      const rows = await tx.delete(table).where(eq(col, companyId)).returning();
      stats[label] = { deleted: rows.length, inserted: 0 };
      console.log(`[Restore] DELETE ${label}: ${rows.length} registros`);
    };

    await del(stockMovements, stockMovements.userId, "stock_movements");
    await del(orderPayments, orderPayments.userId, "order_payments");
    await del(cashEntries, cashEntries.userId, "cash_entries");
    await del(cashClosings, cashClosings.userId, "cash_closings");
    await del(dailyCash, dailyCash.userId, "daily_cash");
    await del(orderFinancials, orderFinancials.userId, "order_financials");
    await del(calculations, calculations.userId, "calculations");
    await del(stockItems, stockItems.userId, "stock_items");
    await del(employees, employees.userId, "employees");
    await del(clients, clients.userId, "clients");
    await del(materials, materials.userId, "materials");
    await del(brands, brands.userId, "brands");
    await del(settings, settings.userId, "settings");

    const ins = async (table: any, rows: any[], label: string) => {
      if (!Array.isArray(rows) || rows.length === 0) {
        stats[label] = { ...stats[label], inserted: 0 };
        console.log(`[Restore] INSERT ${label}: 0 registros (backup vazio)`);
        return;
      }
      await tx.insert(table).values(rows);
      stats[label] = { ...stats[label], inserted: rows.length };
      console.log(`[Restore] INSERT ${label}: ${rows.length} registros`);
    };

    await ins(settings,       data.settings        ?? [], "settings");
    await ins(brands,         data.brands           ?? [], "brands");
    await ins(materials,      data.materials        ?? [], "materials");
    await ins(clients,        data.clients          ?? [], "clients");
    await ins(employees,      data.employees        ?? [], "employees");
    await ins(stockItems,     data.stock_items      ?? [], "stock_items");
    await ins(calculations,   data.calculations     ?? [], "calculations");
    await ins(orderFinancials,data.order_financials ?? [], "order_financials");
    await ins(orderPayments,  data.order_payments   ?? [], "order_payments");
    await ins(cashEntries,    data.cash_entries     ?? [], "cash_entries");
    await ins(cashClosings,   data.cash_closings    ?? [], "cash_closings");
    await ins(dailyCash,      data.daily_cash       ?? [], "daily_cash");
    await ins(stockMovements, data.stock_movements  ?? [], "stock_movements");
  });

  console.log(`[Restore] CONCLUÍDO — empresa: ${companyId}`);
  return { preBackupFilename: preBackup.filename, stats };
}

export async function restoreCompanyBackup(
  companyId: string,
  filename: string,
  performedBy: string
): Promise<{ preBackupFilename: string; stats: Record<string, { deleted: number; inserted: number }> }> {
  const safeFilename = path.basename(filename);

  const fileCompanyId = extractCompanyIdFromFilename(safeFilename);
  if (!fileCompanyId || fileCompanyId !== companyId) {
    throw new Error("Arquivo de backup não pertence a esta empresa.");
  }

  const fullPath = resolveBackupPath(companyId, safeFilename);
  if (!fs.existsSync(fullPath)) {
    throw new Error("Arquivo de backup não encontrado.");
  }

  const compressed = fs.readFileSync(fullPath);
  const jsonBuffer = zlib.gunzipSync(compressed);
  const payload = JSON.parse(jsonBuffer.toString("utf-8"));
  const data = payload?.data;

  if (!data || typeof data !== "object") {
    throw new Error("Arquivo de backup inválido ou corrompido.");
  }

  return executeRestoreFromData(companyId, data, performedBy, safeFilename);
}

export async function restoreCompanyBackupFromBuffer(
  companyId: string,
  gzipBuffer: Buffer,
  performedBy: string
): Promise<{ preBackupFilename: string; stats: Record<string, { deleted: number; inserted: number }> }> {
  let jsonBuffer: Buffer;
  try {
    jsonBuffer = zlib.gunzipSync(gzipBuffer);
  } catch {
    throw new Error("Arquivo inválido: não foi possível descompactar o .gz.");
  }

  let payload: any;
  try {
    payload = JSON.parse(jsonBuffer.toString("utf-8"));
  } catch {
    throw new Error("Arquivo inválido: JSON corrompido.");
  }

  const data = payload?.data;
  const meta = payload?.meta;

  if (!data || typeof data !== "object") {
    throw new Error("Arquivo de backup inválido: estrutura inesperada.");
  }

  const fileCompanyId: string | undefined = meta?.companyId;
  if (fileCompanyId && fileCompanyId !== companyId) {
    throw new Error("Arquivo de backup pertence a outra empresa.");
  }

  return executeRestoreFromData(companyId, data, performedBy, "upload");
}
