import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { DEFAULT_EMPLOYEE_PERMISSIONS } from "@shared/modules";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '5mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

async function ensureMasterAdmin() {
  const MASTER_USERNAME = "hcorbage";
  const MASTER_PASSWORD = "Ftghuh89*";

  // Always enforce role via raw SQL first — never fails due to schema mismatch
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    const rows = await db.execute(sql`SELECT id, role FROM users WHERE username = ${MASTER_USERNAME}`);
    const row = (rows as any).rows?.[0] ?? (rows as any)?.[0];
    if (row) {
      if (row.role !== "super_admin") {
        await db.execute(sql`UPDATE users SET role = 'super_admin', is_admin = true, company_id = NULL WHERE username = ${MASTER_USERNAME}`);
        console.log(`[SEED] Role do master admin corrigida para super_admin via SQL direto.`);
      } else {
        console.log(`[SEED] Admin master OK — role=super_admin.`);
      }
      return;
    }
  } catch (rawErr) {
    console.warn("[SEED] Fallback SQL falhou, tentando via storage:", rawErr);
  }

  // Fallback: ORM
  try {
    const existing = await storage.getUserByUsername(MASTER_USERNAME);
    if (!existing) {
      const hashed = await bcrypt.hash(MASTER_PASSWORD, 10);
      await storage.createUser({
        username: MASTER_USERNAME,
        password: hashed,
        isAdmin: true,
        mustChangePassword: false,
        passwordHint: null,
        cpf: null,
        birthdate: null,
        role: "super_admin",
        companyId: null,
      });
      console.log(`[SEED] Admin master "${MASTER_USERNAME}" criado automaticamente.`);
    } else if (existing.role !== "super_admin") {
      await storage.updateUserRoleAndCompany(existing.id, "super_admin", null);
      console.log(`[SEED] Role do master admin atualizada para super_admin.`);
    }
  } catch (err) {
    console.error("[SEED] Erro ao garantir admin master:", err);
  }
}

async function seedTestAccounts() {
  try {
    const mt1990 = await storage.getUserByUsername("mt1990");
    let companyAdminId: string;

    if (!mt1990) {
      const hashed = await bcrypt.hash("teste123", 10);
      const newUser = await storage.createUser({
        username: "mt1990",
        password: hashed,
        isAdmin: true,
        mustChangePassword: false,
        passwordHint: "teste123",
        cpf: null,
        birthdate: "1990-01-01",
        role: "company_admin",
        companyId: null,
      });
      companyAdminId = newUser.id;
      console.log(`[SEED] Conta de teste company_admin "mt1990" criada.`);
    } else {
      companyAdminId = mt1990.id;
      if (mt1990.mustChangePassword) {
        await storage.setMustChangePassword(mt1990.id, false);
      }
    }

    const as1995 = await storage.getUserByUsername("as1995");
    if (!as1995) {
      const hashed = await bcrypt.hash("funcionario123", 10);
      const empUser = await storage.createUser({
        username: "as1995",
        password: hashed,
        isAdmin: false,
        mustChangePassword: false,
        passwordHint: "funcionario123",
        cpf: null,
        birthdate: "1995-01-01",
        role: "employee",
        companyId: companyAdminId,
      });
      await storage.setUserPermissions(empUser.id, [...DEFAULT_EMPLOYEE_PERMISSIONS]);
      console.log(`[SEED] Conta de teste employee "as1995" criada.`);
    } else {
      if (as1995.mustChangePassword) {
        await storage.setMustChangePassword(as1995.id, false);
        console.log(`[SEED] mustChangePassword de "as1995" removido.`);
      }
      if (!as1995.companyId) {
        await storage.updateUserRoleAndCompany(as1995.id, "employee", companyAdminId);
        console.log(`[SEED] companyId de "as1995" atualizado para ${companyAdminId}.`);
      }
    }
  } catch (err) {
    console.error("[SEED] Erro ao criar contas de teste:", err);
  }
}

(async () => {
  await ensureMasterAdmin();
  await seedTestAccounts();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
