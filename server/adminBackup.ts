import path from "path";
import fs from "fs";
import zlib from "zlib";
import { db } from "./db";
import { eq, inArray } from "drizzle-orm";
import { users, userPermissions, passwordResetTokens } from "@shared/schema";

const ADMIN_BACKUP_BASE_DIR =
  process.env.ADMIN_BACKUP_DIR ??
  (process.env.NODE_ENV === "production"
    ? "/var/backups/corb3dapp/admin"
    : path.join(process.cwd(), "backups", "admin"));

const KEEP_LAST_ADMIN = 20;

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function timestampForFilename(): string {
  return new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "Z");
}

function pruneOldAdminBackups(dir: string, keepLast: number): void {
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json.gz"))
      .sort()
      .reverse();
    for (const f of files.slice(keepLast)) {
      fs.unlinkSync(path.join(dir, f));
    }
  } catch {}
}

/**
 * Gera um Backup Global Administrativo para uma empresa específica.
 * Captura a camada global (users, userPermissions, passwordResetTokens)
 * relativa ao company_admin e todos os employees vinculados.
 */
export async function generateAdminBackupForCompany(
  companyId: string,
  generatedBy: string
): Promise<{ filename: string; size: number }> {
  const companyAdminRows = await db
    .select()
    .from(users)
    .where(eq(users.id, companyId));

  const employeeUserRows = await db
    .select()
    .from(users)
    .where(eq(users.companyId, companyId));

  const allUserIds = [
    ...companyAdminRows.map((u) => u.id),
    ...employeeUserRows.map((u) => u.id),
  ];

  const permissionsRows =
    allUserIds.length > 0
      ? await db
          .select()
          .from(userPermissions)
          .where(inArray(userPermissions.userId, allUserIds))
      : [];

  const tokenRows =
    allUserIds.length > 0
      ? await db
          .select()
          .from(passwordResetTokens)
          .where(inArray(passwordResetTokens.userId, allUserIds))
      : [];

  const payload = {
    meta: {
      version: "1.0",
      type: "admin_global",
      companyId,
      companyUsername: companyAdminRows[0]?.username ?? "desconhecido",
      generatedAt: new Date().toISOString(),
      generatedBy,
      userCount: allUserIds.length,
    },
    data: {
      users: companyAdminRows,
      employee_users: employeeUserRows,
      user_permissions: permissionsRows,
      password_reset_tokens: tokenRows,
    },
  };

  const json = JSON.stringify(payload, null, 2);
  const compressed = zlib.gzipSync(Buffer.from(json, "utf-8"));

  ensureDir(ADMIN_BACKUP_BASE_DIR);
  const ts = timestampForFilename();
  const filename = `admin_${companyId}_${ts}.json.gz`;
  const fullPath = path.join(ADMIN_BACKUP_BASE_DIR, filename);
  fs.writeFileSync(fullPath, compressed);
  pruneOldAdminBackups(ADMIN_BACKUP_BASE_DIR, KEEP_LAST_ADMIN);

  const size = fs.statSync(fullPath).size;
  console.log(
    `[AdminBackup] Backup Global Administrativo gerado: ${filename} (${(size / 1024).toFixed(1)} KB) — empresa: ${companyId} — usuarios: ${allUserIds.length}`
  );
  return { filename, size };
}

/**
 * Gera um Backup Global Administrativo completo (todos os dados globais do sistema).
 * Usado para backups agendados ou manuais da plataforma inteira.
 */
export async function generateFullAdminBackup(
  generatedBy: string
): Promise<{ filename: string; size: number }> {
  const allUsers = await db.select().from(users);
  const allPermissions = await db.select().from(userPermissions);
  const allTokens = await db.select().from(passwordResetTokens);

  const payload = {
    meta: {
      version: "1.0",
      type: "admin_global_full",
      generatedAt: new Date().toISOString(),
      generatedBy,
      userCount: allUsers.length,
    },
    data: {
      users: allUsers,
      user_permissions: allPermissions,
      password_reset_tokens: allTokens,
    },
  };

  const json = JSON.stringify(payload, null, 2);
  const compressed = zlib.gzipSync(Buffer.from(json, "utf-8"));

  ensureDir(ADMIN_BACKUP_BASE_DIR);
  const ts = timestampForFilename();
  const filename = `admin_full_${ts}.json.gz`;
  const fullPath = path.join(ADMIN_BACKUP_BASE_DIR, filename);
  fs.writeFileSync(fullPath, compressed);
  pruneOldAdminBackups(ADMIN_BACKUP_BASE_DIR, KEEP_LAST_ADMIN);

  const size = fs.statSync(fullPath).size;
  console.log(
    `[AdminBackup] Backup Global Administrativo COMPLETO gerado: ${filename} (${(size / 1024).toFixed(1)} KB)`
  );
  return { filename, size };
}

export function listAdminBackups(): {
  filename: string;
  size: number;
  createdAt: string;
}[] {
  ensureDir(ADMIN_BACKUP_BASE_DIR);
  return fs
    .readdirSync(ADMIN_BACKUP_BASE_DIR)
    .filter((f) => f.endsWith(".json.gz"))
    .sort()
    .reverse()
    .map((f) => {
      const stat = fs.statSync(path.join(ADMIN_BACKUP_BASE_DIR, f));
      return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() };
    });
}
