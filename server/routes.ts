import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import session from "express-session";
import { DEFAULT_EMPLOYEE_PERMISSIONS, PERMISSION_MODULES } from "@shared/modules";

declare module "express-session" {
  interface SessionData {
    userId: string;
    username: string;
    isAdmin: boolean;
    isMasterAdmin: boolean;
    role: string;
    companyId: string;
    permissions: string[];
  }
}

const MASTER_ADMIN_USERNAME = "hcorbage";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Não autorizado" });
}

function requirePermission(module: string): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Não autorizado" });
    if (req.session.isAdmin) return next();
    let perms: string[] = req.session.permissions || [];
    if (perms.length === 0) {
      perms = await storage.getUserPermissions(req.session.userId);
      req.session.permissions = perms;
    }
    if (perms.includes(module)) return next();
    return res.status(403).json({ message: "Acesso não permitido para este módulo." });
  };
}

function getScopeId(req: Request): string {
  return req.session.companyId || req.session.userId!;
}

function stripUserId(body: any) {
  const { userId, user_id, id, ...rest } = body || {};
  return rest;
}

const VALID_CASH_TYPES = ["entrada", "saida"] as const;
type CashType = typeof VALID_CASH_TYPES[number];

function normalizeCashType(raw: unknown): CashType {
  const normalized = String(raw ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (normalized === "entrada" || normalized === "saida") return normalized;
  throw new Error(`Tipo inválido: "${raw}". Use apenas "entrada" ou "saida".`);
}

async function isTodayCashClosed(userId: string): Promise<boolean> {
  const BRAZIL_OFFSET_MS = -3 * 60 * 60 * 1000;
  const today = new Date(Date.now() + BRAZIL_OFFSET_MS).toISOString().slice(0, 10);
  const todayCash = await storage.getTodayDailyCash(userId, today);
  return !!(todayCash && todayCash.status === "fechado");
}

const DEFAULT_MATERIALS = [
  { name: 'PLA (Ácido Polilático)', costPerKg: 85.90 },
  { name: 'PLA+ (PLA Reforçado)', costPerKg: 95.00 },
  { name: 'PLA Silk (Seda)', costPerKg: 110.00 },
  { name: 'PLA Matte (Fosco)', costPerKg: 105.00 },
  { name: 'PLA Marble (Mármore)', costPerKg: 115.00 },
  { name: 'PLA Glow (Brilha no Escuro)', costPerKg: 120.00 },
  { name: 'PLA Dual Color (Bicolor)', costPerKg: 130.00 },
  { name: 'PLA Metal Fill (Partículas Metálicas)', costPerKg: 180.00 },
  { name: 'PLA Wood Fill (Madeira)', costPerKg: 160.00 },
  { name: 'PLA CF (Fibra de Carbono)', costPerKg: 200.00 },
  { name: 'PLA High Speed (Alta Velocidade)', costPerKg: 110.00 },
  { name: 'PLA Reciclado', costPerKg: 75.00 },
  { name: 'PETG (Polietileno Tereftalato Glicol)', costPerKg: 95.50 },
  { name: 'PETG-CF (PETG com Fibra de Carbono)', costPerKg: 250.00 },
  { name: 'PETG-GF (PETG com Fibra de Vidro)', costPerKg: 220.00 },
  { name: 'PETG Translúcido', costPerKg: 100.00 },
  { name: 'ABS (Acrilonitrila Butadieno Estireno)', costPerKg: 75.00 },
  { name: 'ABS+ (ABS Reforçado)', costPerKg: 85.00 },
  { name: 'ABS-GF (ABS com Fibra de Vidro)', costPerKg: 200.00 },
  { name: 'ABS-CF (ABS com Fibra de Carbono)', costPerKg: 280.00 },
  { name: 'ASA (Acrilonitrila Estireno Acrilato)', costPerKg: 120.00 },
  { name: 'TPU 95A (Flexível)', costPerKg: 150.00 },
  { name: 'TPU 85A (Super Flexível)', costPerKg: 170.00 },
  { name: 'TPU 64D (Semi-Rígido)', costPerKg: 160.00 },
  { name: 'TPE (Elastômero Termoplástico)', costPerKg: 180.00 },
  { name: 'TPC (Copoliéster Flexível)', costPerKg: 190.00 },
  { name: 'Nylon PA6 (Poliamida 6)', costPerKg: 220.00 },
  { name: 'Nylon PA12 (Poliamida 12)', costPerKg: 280.00 },
  { name: 'Nylon PA6-CF (Nylon com Fibra de Carbono)', costPerKg: 380.00 },
  { name: 'Nylon PA6-GF (Nylon com Fibra de Vidro)', costPerKg: 300.00 },
  { name: 'Nylon PA12-CF (Nylon 12 com Fibra de Carbono)', costPerKg: 420.00 },
  { name: 'PC (Policarbonato)', costPerKg: 250.00 },
  { name: 'PC-ABS (Policarbonato + ABS)', costPerKg: 230.00 },
  { name: 'PC-CF (Policarbonato com Fibra de Carbono)', costPerKg: 350.00 },
  { name: 'POM (Poliacetal / Delrin)', costPerKg: 280.00 },
  { name: 'PP (Polipropileno)', costPerKg: 200.00 },
  { name: 'PP-GF (Polipropileno com Fibra de Vidro)', costPerKg: 260.00 },
  { name: 'HIPS (Poliestireno de Alto Impacto)', costPerKg: 90.00 },
  { name: 'PVA (Álcool Polivinílico - Suporte Solúvel)', costPerKg: 350.00 },
  { name: 'PVB (Butiral de Polivinila)', costPerKg: 320.00 },
  { name: 'PVDF (Fluoreto de Polivinilideno)', costPerKg: 500.00 },
  { name: 'PEI / ULTEM (Polieterimida)', costPerKg: 800.00 },
  { name: 'PEEK (Poliéter Éter Cetona)', costPerKg: 2500.00 },
  { name: 'PEKK (Poliéter Cetona Cetona)', costPerKg: 2200.00 },
  { name: 'PPS (Sulfeto de Polifenileno)', costPerKg: 1500.00 },
  { name: 'PSU (Polisulfona)', costPerKg: 900.00 },
  { name: 'PA-CF (Poliamida com Fibra de Carbono)', costPerKg: 400.00 },
  { name: 'Fibra de Carbono Blend (Genérico)', costPerKg: 350.00 },
  { name: 'Fibra de Vidro Blend (Genérico)', costPerKg: 250.00 },
  { name: 'Metal Fill - Aço Inox', costPerKg: 450.00 },
  { name: 'Metal Fill - Bronze', costPerKg: 420.00 },
  { name: 'Metal Fill - Cobre', costPerKg: 430.00 },
  { name: 'Metal Fill - Alumínio', costPerKg: 400.00 },
  { name: 'Cerâmica Fill', costPerKg: 500.00 },
  { name: 'Resina Standard (UV 405nm)', costPerKg: 140.00 },
  { name: 'Resina Lavável em Água', costPerKg: 160.00 },
  { name: 'Resina Tough (Alta Resistência)', costPerKg: 280.00 },
  { name: 'Resina Flexível', costPerKg: 320.00 },
  { name: 'Resina Castable (Fundível)', costPerKg: 450.00 },
  { name: 'Resina ABS-Like', costPerKg: 200.00 },
  { name: 'Resina Dental (Biocompatível)', costPerKg: 600.00 },
  { name: 'Resina Transparente (Clear)', costPerKg: 180.00 },
  { name: 'Resina Cerâmica', costPerKg: 400.00 },
  { name: 'Resina High Temp (Alta Temperatura)', costPerKg: 350.00 },
  { name: 'Resina Engineering (Engenharia)', costPerKg: 300.00 },
  { name: 'Resina Nylon-Like', costPerKg: 250.00 },
  { name: 'Resina PP-Like (Polipropileno)', costPerKg: 260.00 },
  { name: 'Resina Elástica (Rubber-Like)', costPerKg: 350.00 },
  { name: 'Resina Plant-Based (Base Vegetal)', costPerKg: 190.00 },
  { name: 'Resina 8K (Ultra Detalhe)', costPerKg: 220.00 },
  { name: 'Resina Colorida (Pigmentada)', costPerKg: 170.00 },
];

const DEFAULT_BRANDS = [
  "3DFila", "Voolt3D", "Sethi3D", "PrintaLot", "GTMax", "Fila3D", "Cliever", "Copymaker", "Natur3D",
  "eSun", "Sunlu", "Polymaker", "Creality", "Bambu Lab", "Anycubic", "Elegoo", "Prusament", "Hatchbox", "Overture", "MatterHackers", "Siraya Tech", "Phrozen",
  "F3d", "Masterprint", "Triade"
];

async function seedBrandsForUser(userId: string) {
  const count = await storage.getBrandCount(userId);
  if (count === 0) {
    for (const name of DEFAULT_BRANDS) {
      await storage.createBrand({ name, userId });
    }
    console.log(`Seeded ${DEFAULT_BRANDS.length} default brands for user ${userId}`);
  }
}

async function seedMaterialsForUser(userId: string) {
  const count = await storage.getMaterialCount(userId);
  if (count === 0) {
    for (const mat of DEFAULT_MATERIALS) {
      await storage.createMaterial({ ...mat, userId });
    }
    console.log(`Seeded ${DEFAULT_MATERIALS.length} default materials for user ${userId}`);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use(session({
    secret: process.env.SESSION_SECRET || 'corb3d-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
    }
  }));

  // ---- AUTH ----
  app.post("/api/auth/register", async (_req, res) => {
    return res.status(403).json({ message: "Registro desabilitado. Solicite ao administrador master." });
  });

  app.post("/api/create-admin", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Usuário e senha são obrigatórios." });
      }
      const hashed = await bcrypt.hash(password, 10);
      await storage.createUser({ username, password: hashed, isAdmin: true, mustChangePassword: false, passwordHint: null, cpf: null, birthdate: null });
      return res.json({ message: "Admin criado" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Erro ao criar admin." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Usuário e senha são obrigatórios." });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Usuário ou senha incorretos." });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Usuário ou senha incorretos." });
      }
      let isAdmin = user.isAdmin;
      if (!isAdmin) {
        const allUsers = await storage.getAllUsers();
        if (allUsers.length > 0 && allUsers[0].id === user.id) {
          await storage.promoteToAdmin(user.id);
          isAdmin = true;
        }
      }
      await seedMaterialsForUser(user.id);
      await seedBrandsForUser(user.id);

      const role = user.role || (isAdmin ? (user.username === MASTER_ADMIN_USERNAME ? "super_admin" : "company_admin") : "employee");
      let companyId = user.id;
      let permissions: string[] = [];
      if (!isAdmin) {
        const empRecord = await storage.getEmployeeByLinkedUserId(user.id);
        companyId = user.companyId || (empRecord ? empRecord.userId : user.id);
        permissions = await storage.getUserPermissions(user.id);
        if (permissions.length === 0) permissions = [...DEFAULT_EMPLOYEE_PERMISSIONS];
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.isAdmin = isAdmin;
      req.session.isMasterAdmin = user.username === MASTER_ADMIN_USERNAME;
      req.session.role = role;
      req.session.companyId = companyId;
      req.session.permissions = permissions;
      return res.json({ id: user.id, username: user.username, isAdmin, isMasterAdmin: req.session.isMasterAdmin, mustChangePassword: user.mustChangePassword || false, role, companyId, permissions });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/auth/check-admin", async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) return res.json({ isAdmin: false });
      const user = await storage.getUserByUsername(username);
      if (!user) return res.json({ isAdmin: false });
      return res.json({ isAdmin: user.isAdmin });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { username, cpf, birthdate } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Informe o nome de usuário." });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado." });
      }
      if (user.isAdmin) {
        if (!cpf || !birthdate) {
          return res.status(400).json({ message: "CPF e data de nascimento são obrigatórios para resetar a senha do administrador." });
        }
        const cleanCpf = cpf.replace(/\D/g, '');
        if (cleanCpf !== user.cpf || birthdate !== user.birthdate) {
          return res.status(403).json({ message: "CPF ou data de nascimento incorretos." });
        }
      }
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let tempPassword = '';
      for (let i = 0; i < 6; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const hashed = await bcrypt.hash(tempPassword, 10);
      await storage.updateUserPassword(user.id, hashed);
      await storage.setMustChangePassword(user.id, true);
      return res.json({ tempPassword });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/auth/force-change-password", async (req, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Não autenticado." });
      }
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres." });
      }
      const hashed = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(req.session.userId, hashed);
      await storage.setMustChangePassword(req.session.userId, false);
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (req.session && req.session.userId) {
      return res.json({ id: req.session.userId, username: req.session.username, isAdmin: req.session.isAdmin || false, isMasterAdmin: req.session.isMasterAdmin || false, role: req.session.role || "company_admin", companyId: req.session.companyId || req.session.userId, permissions: req.session.permissions || [] });
    }
    return res.status(401).json({ needsSetup: false });
  });

  app.post("/api/auth/password-hint", async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Informe o usuário." });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado." });
      }
      return res.json({ hint: user.passwordHint || null });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/auth/admin-whatsapp", async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Informe o usuário." });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado." });
      }
      const adminUsers = await storage.getAdminUsers();
      if (adminUsers.length === 0) {
        return res.status(404).json({ message: "Nenhum administrador encontrado." });
      }
      const adminId = adminUsers[0].id;
      const adminSettings = await storage.getSettings(adminId);
      const whatsapp = adminSettings?.adminWhatsapp || null;
      return res.json({ whatsapp });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  const requireAdmin: RequestHandler = (req, res, next) => {
    if (!req.session || !req.session.isAdmin) {
      return res.status(403).json({ message: "Acesso restrito ao administrador." });
    }
    next();
  };

  const requireMasterAdmin: RequestHandler = (req, res, next) => {
    if (!req.session || !req.session.isMasterAdmin) {
      return res.status(403).json({ message: "Acesso restrito ao administrador master." });
    }
    next();
  };

  // ---- USER MANAGEMENT (admin only) ----
  app.get("/api/users", requireAuth, requireMasterAdmin, async (_req, res) => {
    const usersList = await storage.getAdminUsers();
    res.json(usersList);
  });

  app.post("/api/users", requireAuth, requireMasterAdmin, async (req, res) => {
    try {
      const { username, password, passwordHint, cpf, birthdate } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Nome e senha são obrigatórios." });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres." });
      }
      if (!cpf || !birthdate) {
        return res.status(400).json({ message: "CPF e data de nascimento são obrigatórios." });
      }
      const nameParts = username.trim().split(/\s+/).filter((p: string) => p.length > 0);
      const firstInitial = (nameParts[0] || 'u').charAt(0).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
      const birthYear = new Date(birthdate).getFullYear();
      const baseLogin = `${firstInitial}${lastInitial}${birthYear}`;
      let generatedLogin = baseLogin;
      let counter = 1;
      while (await storage.getUserByUsername(generatedLogin)) {
        generatedLogin = `${baseLogin}_${counter}`;
        counter++;
      }
      const hashed = await bcrypt.hash(password, 10);
      const userData: any = { username: generatedLogin, password: hashed, isAdmin: true, passwordHint: passwordHint || null };
      userData.cpf = cpf.replace(/\D/g, '');
      userData.birthdate = birthdate;
      const user = await storage.createUser(userData);
      await seedMaterialsForUser(user.id);
      await seedBrandsForUser(user.id);
      return res.json({ id: user.id, username: user.username, generatedLogin: generatedLogin, fullName: username.trim() });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/users/:id/password", requireAuth, async (req, res) => {
    try {
      const userId = req.params.id as string;
      const isSelf = req.session.userId === userId;
      if (!isSelf && !req.session.isMasterAdmin) {
        return res.status(403).json({ message: "Acesso restrito ao administrador master." });
      }
      const { currentPassword, newPassword, passwordHint } = req.body;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado." });
      }
      if (isSelf) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Informe a senha atual." });
        }
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
          return res.status(400).json({ message: "Senha atual incorreta." });
        }
      }
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres." });
      }
      const hashed = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(userId, hashed, passwordHint !== undefined ? passwordHint : undefined);
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireMasterAdmin, async (req, res) => {
    const userId = req.params.id as string;
    if (req.session.userId === userId) {
      return res.status(400).json({ message: "Você não pode excluir sua própria conta." });
    }
    await storage.deleteUser(userId);
    res.json({ ok: true });
  });

  // ---- PROTECTED ROUTES ----
  app.use("/api/clients", requireAuth);
  app.use("/api/materials", requireAuth);
  app.use("/api/stock-items", requireAuth);
  app.use("/api/employees", requireAuth);
  app.use("/api/calculations", requireAuth);
  app.use("/api/settings", requireAuth);
  app.use("/api/brands", requireAuth);
  app.use("/api/backup", requireAuth);

  // ---- CLIENTS ----
  app.get("/api/clients", requirePermission("clientes"), async (req, res) => {
    const data = await storage.getClients(getScopeId(req));
    res.json(data);
  });
  app.post("/api/clients", requirePermission("clientes"), async (req, res) => {
    const client = await storage.createClient({ ...stripUserId(req.body), userId: getScopeId(req) });
    res.json(client);
  });
  app.patch("/api/clients/:id", requirePermission("clientes"), async (req, res) => {
    const client = await storage.updateClient(req.params.id, getScopeId(req), stripUserId(req.body));
    res.json(client);
  });
  app.delete("/api/clients/:id", requirePermission("clientes"), async (req, res) => {
    await storage.deleteClient(req.params.id, getScopeId(req));
    res.json({ ok: true });
  });

  // ---- MATERIALS ----
  app.get("/api/materials", async (req, res) => {
    const data = await storage.getMaterials(req.session.userId!);
    res.json(data);
  });
  app.post("/api/materials", async (req, res) => {
    const material = await storage.createMaterial({ ...stripUserId(req.body), userId: req.session.userId! });
    res.json(material);
  });
  app.patch("/api/materials/:id", async (req, res) => {
    const material = await storage.updateMaterial(req.params.id, req.session.userId!, stripUserId(req.body));
    res.json(material);
  });
  app.delete("/api/materials/:id", async (req, res) => {
    await storage.deleteMaterial(req.params.id, req.session.userId!);
    res.json({ ok: true });
  });

  // ---- STOCK ITEMS ----
  app.get("/api/stock-items", requirePermission("estoque"), async (req, res) => {
    const data = await storage.getStockItems(getScopeId(req));
    res.json(data);
  });
  app.post("/api/stock-items", requirePermission("estoque"), async (req, res) => {
    const item = await storage.createStockItem({ ...stripUserId(req.body), userId: getScopeId(req) });
    res.json(item);
  });
  app.patch("/api/stock-items/:id", requirePermission("estoque"), async (req, res) => {
    const item = await storage.updateStockItem(req.params.id, getScopeId(req), stripUserId(req.body));
    res.json(item);
  });
  app.delete("/api/stock-items/:id", requirePermission("estoque"), async (req, res) => {
    await storage.deleteStockItem(req.params.id, getScopeId(req));
    res.json({ ok: true });
  });

  // ---- STOCK MOVEMENTS ----
  app.get("/api/stock-movements/:stockItemId", requirePermission("estoque"), async (req, res) => {
    try {
      const movements = await storage.getStockMovements(getScopeId(req), req.params.stockItemId);
      res.json(movements);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/stock-movements", requirePermission("estoque"), async (req, res) => {
    try {
      const { stockItemId, type, quantity, date, notes, triggeredBy, calculationId, generateCashEntry, purchaseValue, cashCategory, cashWasClosed } = req.body;
      if (!stockItemId || !type || !quantity || !date) {
        return res.status(400).json({ message: "Campos obrigatórios: stockItemId, type, quantity, date" });
      }
      const validTypes = ["entrada", "saida", "ajuste"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Tipo inválido. Use: entrada, saida, ajuste" });
      }
      // Check cash status BEFORE saving anything — so user can decide without side effects
      const needsCashEntry = generateCashEntry && type === "entrada" && purchaseValue && Number(purchaseValue) > 0;
      if (needsCashEntry && await isTodayCashClosed(getScopeId(req))) {
        return res.status(409).json({ cashClosed: true, message: "O caixa de hoje está fechado." });
      }

      // Build audit note when user explicitly chose to proceed with cash closed
      let finalNotes = notes || "";
      if (cashWasClosed === true) {
        const nowBRT = new Date(Date.now() - 3 * 60 * 60 * 1000);
        const dd = String(nowBRT.getUTCDate()).padStart(2, "0");
        const mm = String(nowBRT.getUTCMonth() + 1).padStart(2, "0");
        const yyyy = nowBRT.getUTCFullYear();
        const hh = String(nowBRT.getUTCHours()).padStart(2, "0");
        const min = String(nowBRT.getUTCMinutes()).padStart(2, "0");
        const valorFmt = purchaseValue && Number(purchaseValue) > 0
          ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(purchaseValue))
          : "";
        const auditNote = `[CAIXA FECHADO] Movimentação confirmada com caixa fechado em ${dd}/${mm}/${yyyy} às ${hh}:${min} por ${req.session.username || "usuário"}.${valorFmt ? ` Lançamento financeiro de ${valorFmt} NÃO registrado no Livro Caixa.` : ""}`;
        finalNotes = finalNotes ? `${finalNotes} | ${auditNote}` : auditNote;
      }

      const result = await storage.createStockMovement(
        getScopeId(req), stockItemId, type, Number(quantity), date,
        finalNotes, triggeredBy || "manual", calculationId
      );
      if (needsCashEntry) {
        const stockItem = result.stockItem;
        const matDesc = `Compra de material: ${notes || stockItemId}`;
        await storage.createCashEntry({
          userId: getScopeId(req),
          calculationId: null,
          clientName: "",
          projectName: "",
          description: matDesc,
          amount: Number(purchaseValue),
          paymentMethod: "outros",
          date: date,
          closingId: null,
          notes: cashCategory || "Matéria-prima",
          type: "saida",
          category: cashCategory || "Matéria-prima / Insumos",
          status: "realizado",
          effectiveDate: date,
          sellerUserId: null,
          sellerName: null,
        });
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ---- EMPLOYEES ----
  app.get("/api/employees", async (req, res) => {
    if (req.session.isAdmin) {
      const data = await storage.getEmployees(req.session.userId!);
      const enriched = await Promise.all(data.map(async (emp) => {
        if (emp.linkedUserId) {
          const linkedUser = await storage.getUserById(emp.linkedUserId);
          return { ...emp, linkedUsername: linkedUser?.username || null };
        }
        return { ...emp, linkedUsername: null };
      }));
      res.json(enriched);
    } else {
      const emp = await storage.getEmployeeByLinkedUserId(req.session.userId!);
      res.json(emp ? [emp] : []);
    }
  });
  app.post("/api/employees", requireAdmin, async (req, res) => {
    try {
      const body = stripUserId(req.body);
      const emp = await storage.createEmployee({ ...body, userId: req.session.userId! });
      
      const nameParts = body.name.trim().split(/\s+/).filter((p: string) => p.length > 0);
      const firstInitial = (nameParts[0] || 'u').charAt(0).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
      const birthYear = body.birthdate ? new Date(body.birthdate).getFullYear() : new Date().getFullYear();
      const baseUsername = `${firstInitial}${lastInitial}${birthYear}`;
      let username = baseUsername;
      let counter = 1;
      while (await storage.getUserByUsername(username)) {
        username = `${baseUsername}_${counter}`;
        counter++;
      }
      
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let tempPassword = '';
      for (let i = 0; i < 6; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const hashed = await bcrypt.hash(tempPassword, 10);
      const user = await storage.createUser({ username, password: hashed, isAdmin: false, mustChangePassword: true, role: "employee", companyId: req.session.userId! });
      await seedMaterialsForUser(user.id);
      await seedBrandsForUser(user.id);
      await storage.setUserPermissions(user.id, [...DEFAULT_EMPLOYEE_PERMISSIONS]);
      
      await storage.updateEmployee(emp.id, req.session.userId!, { linkedUserId: user.id });
      
      res.json({ ...emp, linkedUserId: user.id, generatedUsername: username, generatedPassword: tempPassword });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  app.patch("/api/employees/:id", requireAdmin, async (req, res) => {
    const emp = await storage.updateEmployee(req.params.id, req.session.userId!, stripUserId(req.body));
    res.json(emp);
  });
  app.delete("/api/employees/:id", requireAdmin, async (req, res) => {
    const emp = await storage.getEmployee(req.params.id, req.session.userId!);
    if (emp?.linkedUserId) {
      await storage.deleteUser(emp.linkedUserId);
    }
    await storage.deleteEmployee(req.params.id, req.session.userId!);
    res.json({ ok: true });
  });

  // ---- CALCULATIONS ----
  app.get("/api/calculations", async (req, res) => {
    if (req.session.isAdmin) {
      const emps = await storage.getEmployees(req.session.userId!);
      const allUserIds = [req.session.userId!, ...emps.filter(e => e.linkedUserId).map(e => e.linkedUserId!)];
      const allCalcs = await storage.getCalculationsForUserIds(allUserIds);
      res.json(allCalcs);
    } else {
      const data = await storage.getCalculations(req.session.userId!);
      res.json(data);
    }
  });
  app.post("/api/calculations", async (req, res) => {
    const calc = await storage.createCalculation({ ...stripUserId(req.body), userId: req.session.userId! });
    res.json(calc);
  });
  app.patch("/api/calculations/:id", async (req, res) => {
    let calc = await storage.updateCalculation(req.params.id, req.session.userId!, stripUserId(req.body));
    if (!calc && req.session.isAdmin) {
      const emps = await storage.getEmployees(req.session.userId!);
      for (const emp of emps) {
        if (emp.linkedUserId) {
          calc = await storage.updateCalculation(req.params.id, emp.linkedUserId, stripUserId(req.body));
          if (calc) break;
        }
      }
    }
    res.json(calc);
  });
  app.delete("/api/calculations/:id", async (req, res) => {
    const own = await storage.getCalculation(req.params.id, req.session.userId!);
    if (own) {
      await storage.deleteCalculation(req.params.id, req.session.userId!);
    } else if (req.session.isAdmin) {
      const emps = await storage.getEmployees(req.session.userId!);
      for (const emp of emps) {
        if (emp.linkedUserId) {
          const empCalc = await storage.getCalculation(req.params.id, emp.linkedUserId);
          if (empCalc) {
            await storage.deleteCalculation(req.params.id, emp.linkedUserId);
            break;
          }
        }
      }
    }
    res.json({ ok: true });
  });

  // ---- BRANDS ----
  app.get("/api/brands", async (req, res) => {
    await seedBrandsForUser(req.session.userId!);
    const data = await storage.getBrands(req.session.userId!);
    res.json(data);
  });
  app.post("/api/brands", async (req, res) => {
    const { name } = stripUserId(req.body);
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Nome da marca é obrigatório." });
    }
    const existing = await storage.getBrands(req.session.userId!);
    if (existing.some((b: any) => b.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(400).json({ message: "Esta marca já existe." });
    }
    const brand = await storage.createBrand({ name: name.trim(), userId: req.session.userId! });
    res.json(brand);
  });
  app.delete("/api/brands/:id", async (req, res) => {
    await storage.deleteBrand(req.params.id, req.session.userId!);
    res.json({ ok: true });
  });

  // ---- SETTINGS ----
  app.get("/api/settings", async (req, res) => {
    const data = await storage.getSettings(req.session.userId!);
    if (!req.session.isAdmin && !data.logoUrl) {
      const emp = await storage.getEmployeeByLinkedUserId(req.session.userId!);
      if (emp) {
        const adminSettings = await storage.getSettings(emp.userId);
        if (adminSettings.logoUrl) data.logoUrl = adminSettings.logoUrl;
        if (adminSettings.selectedPrinterId) data.selectedPrinterId = adminSettings.selectedPrinterId;
      } else {
        const admins = await storage.getAdminUsers();
        if (admins.length > 0) {
          const adminSettings = await storage.getSettings(admins[0].id);
          if (adminSettings.logoUrl) data.logoUrl = adminSettings.logoUrl;
        }
      }
    }
    res.json(data);
  });
  app.patch("/api/settings", async (req, res) => {
    const data = await storage.updateSettings(req.session.userId!, stripUserId(req.body));
    res.json(data);
  });

  // ---- BACKUP (bulk import) ----
  app.post("/api/backup/import", async (req, res) => {
    const userId = req.session.userId!;
    const { clients: importClients, inventory, stockItems: importStock, history, settings: importSettings } = req.body;
    
    if (importClients && Array.isArray(importClients)) {
      for (const c of importClients) {
        const { id, userId: _, ...rest } = c;
        await storage.createClient({ ...rest, userId });
      }
    }
    if (inventory && Array.isArray(inventory)) {
      const existing = await storage.getMaterials(userId);
      for (const e of existing) await storage.deleteMaterial(e.id, userId);
      for (const m of inventory) {
        const { id, userId: _, ...rest } = m;
        await storage.createMaterial({ ...rest, userId });
      }
    }
    if (importStock && Array.isArray(importStock)) {
      const existing = await storage.getStockItems(userId);
      for (const e of existing) await storage.deleteStockItem(e.id, userId);
      for (const s of importStock) {
        const { id, userId: _, ...rest } = s;
        await storage.createStockItem({ ...rest, userId });
      }
    }
    if (history && Array.isArray(history)) {
      const existing = await storage.getCalculations(userId);
      for (const e of existing) await storage.deleteCalculation(e.id, userId);
      for (const h of history) {
        const { id, userId: _, ...rest } = h;
        await storage.createCalculation({ ...rest, userId });
      }
    }
    if (importSettings) {
      const { id, userId: _, ...rest } = importSettings;
      await storage.updateSettings(userId, rest);
    }
    
    res.json({ ok: true });
  });

  app.get("/api/cep/:cep", requireAuth as RequestHandler, async (req: Request, res: Response) => {
    const cep = req.params.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      return res.status(400).json({ error: "CEP inválido" });
    }
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
      if (!response.ok) throw new Error("BrasilAPI failed");
      const data = await response.json();
      res.json({
        logradouro: data.street || '',
        bairro: data.neighborhood || '',
        localidade: data.city || '',
        uf: data.state || '',
        cep: data.cep || cep,
      });
    } catch {
      try {
        const response2 = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response2.ok) throw new Error("ViaCEP failed");
        const data2 = await response2.json();
        res.json(data2);
      } catch {
        res.status(500).json({ error: "Erro ao buscar CEP" });
      }
    }
  });

  // Financial Dashboard Summary
  app.get("/api/financial/summary", requirePermission("financeiro"), async (req, res) => {
    const userId = getScopeId(req);
    const [entries, ofs, dcs] = await Promise.all([
      storage.getCashEntries(userId),
      storage.getOrderFinancials(userId),
      storage.getDailyCashList(userId),
    ]);
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const today = now.toISOString().slice(0, 10);
    const monthEntries = entries.filter(e => e.date.startsWith(currentMonth) && e.status !== "cancelado");
    const totalIn = monthEntries.filter(e => e.type === "entrada").reduce((s, e) => s + e.amount, 0);
    const totalOut = monthEntries.filter(e => e.type === "saida").reduce((s, e) => s + e.amount, 0);
    const todayEntries = entries.filter(e => e.date === today && e.status !== "cancelado");
    const todayIn = todayEntries.filter(e => e.type === "entrada").reduce((s, e) => s + e.amount, 0);
    const todayOut = todayEntries.filter(e => e.type === "saida").reduce((s, e) => s + e.amount, 0);
    const byPayment: Record<string, number> = {};
    monthEntries.filter(e => e.type === "entrada").forEach(e => {
      byPayment[e.paymentMethod] = (byPayment[e.paymentMethod] || 0) + e.amount;
    });
    const openDailyCash = dcs.find(d => d.date === today && d.status === "aberto");
    res.json({
      monthlyIn: totalIn, monthlyOut: totalOut, monthlyNet: totalIn - totalOut,
      todayIn, todayOut,
      ordersPending: ofs.filter(o => o.status === "pendente").length,
      ordersPartial: ofs.filter(o => o.status === "parcial").length,
      ordersPaid: ofs.filter(o => o.status === "pago").length,
      byPayment,
      openDailyCash: openDailyCash || null,
    });
  });

  // Order Financials
  app.get("/api/client-financials", requirePermission("relatorio_clientes"), async (req, res) => {
    const data = await storage.getClientFinancialsSummary(getScopeId(req));
    res.json(data);
  });

  app.get("/api/order-financials", requirePermission("pedidos_financeiro"), async (req, res) => {
    const data = await storage.getOrderFinancials(getScopeId(req));
    res.json(data);
  });

  app.get("/api/order-financials/by-calc/:calcId", requirePermission("pedidos_financeiro"), async (req, res) => {
    const data = await storage.getOrderFinancialByCalculationId(req.params.calcId, getScopeId(req));
    res.json(data || null);
  });

  app.post("/api/order-financials", requirePermission("pedidos_financeiro"), async (req, res) => {
    const sellerUserId = getScopeId(req);
    const sellerName = req.session.username || "";
    const body = stripUserId(req.body);
    // Idempotent: don't create duplicate for same calculationId (global search)
    const existing = await storage.getOrderFinancialByCalculationId(body.calculationId, sellerUserId);
    if (existing) return res.json(existing);
    const now = new Date().toISOString();
    // Use cash owner's userId if a daily cash is open; otherwise use seller's
    const openCash = await storage.getAnyOpenDailyCash();
    const userId = openCash ? openCash.userId : sellerUserId;
    // Sanitize dueDate: empty string → null (column is DATE type in DB)
    const dueDate = body.dueDate && body.dueDate.trim() ? body.dueDate.trim() : null;
    const of = await storage.createOrderFinancial({
      ...body, dueDate, userId, createdAt: now, amountPaid: 0, amountPending: body.totalAmount,
      sellerUserId: openCash ? sellerUserId : null,
      sellerName: openCash ? sellerName : null,
    });
    res.json(of);
  });

  app.patch("/api/order-financials/:id", requirePermission("pedidos_financeiro"), async (req, res) => {
    const userId = getScopeId(req);
    const body = stripUserId(req.body);
    if ("dueDate" in body) body.dueDate = body.dueDate && body.dueDate.trim() ? body.dueDate.trim() : null;
    const updated = await storage.updateOrderFinancial(req.params.id, userId, body);
    if (!updated) return res.status(404).json({ message: "Não encontrado" });
    res.json(updated);
  });

  // Order Payments
  app.get("/api/order-payments/:orderFinancialId", requirePermission("pedidos_financeiro"), async (req, res) => {
    const data = await storage.getOrderPayments(getScopeId(req), req.params.orderFinancialId);
    res.json(data);
  });

  app.post("/api/order-payments", requirePermission("pedidos_financeiro"), async (req, res) => {
    const sellerUserId = getScopeId(req);
    if (await isTodayCashClosed(sellerUserId)) {
      return res.status(409).json({ message: "O caixa de hoje está fechado. Reabra o caixa para registrar recebimentos." });
    }
    const sellerName = req.session.username || "";
    const body = stripUserId(req.body);
    const now = new Date().toISOString();
    // Determine the target userId: use open daily cash owner if exists
    const openCash = await storage.getAnyOpenDailyCash();
    const userId = openCash ? openCash.userId : sellerUserId;
    const isSeller = openCash && openCash.userId !== sellerUserId;
    // Create payment record
    const op = await storage.createOrderPayment({
      ...body, userId, createdAt: now,
      sellerUserId: isSeller ? sellerUserId : null,
      sellerName: isSeller ? sellerName : null,
    });
    // Update order financial totals (global search by calculationId)
    const of = await storage.getOrderFinancialByCalculationId(body.calculationId, sellerUserId);
    if (of) {
      const newPaid = of.amountPaid + op.amount;
      const newPending = Math.max(0, of.totalAmount - newPaid);
      const newStatus = newPending <= 0 ? "pago" : newPaid > 0 ? "parcial" : "pendente";
      const firstDate = of.firstPaymentDate || body.date;
      await storage.updateOrderFinancial(of.id, of.userId, {
        amountPaid: newPaid, amountPending: newPending, status: newStatus,
        firstPaymentDate: firstDate, paymentMethod: body.paymentMethod,
      });
      // Create cash entry under the cash owner's userId
      await storage.createCashEntry({
        userId, calculationId: body.calculationId,
        clientName: of.clientName, projectName: of.projectName,
        description: `Recebimento: ${of.projectName || of.clientName}`,
        amount: op.amount, paymentMethod: body.paymentMethod,
        date: body.date, type: "entrada", category: "venda de pedido",
        status: "realizado", effectiveDate: body.date, notes: body.notes || "",
        sellerUserId: isSeller ? sellerUserId : null,
        sellerName: isSeller ? sellerName : null,
      });
    }
    res.json(op);
  });

  app.delete("/api/order-payments/:id", requirePermission("pedidos_financeiro"), async (req, res) => {
    const userId = getScopeId(req);
    // Fetch payment first so we can cascade-delete related records
    const payment = await storage.getOrderPaymentById(req.params.id);
    if (payment) {
      // 1. Remove the matching cash_entry generated when this payment was created
      if (payment.calculationId) {
        await storage.deleteCashEntryByPayment(
          payment.calculationId, payment.amount, payment.date, payment.userId
        );
      }
      // 2. Recalculate order_financial after removing this payment
      const of = await storage.getOrderFinancialByCalculationId(payment.calculationId!, userId);
      if (of) {
        const newPaid = Math.max(0, of.amountPaid - payment.amount);
        const newPending = Math.max(0, of.totalAmount - newPaid);
        const newStatus = newPending <= 0 ? "pago" : newPaid > 0 ? "parcial" : "pendente";
        await storage.updateOrderFinancial(of.id, of.userId, {
          amountPaid: newPaid, amountPending: newPending, status: newStatus,
        });
      }
    }
    // 3. Delete the payment record itself
    await storage.deleteOrderPayment(req.params.id, userId);
    res.json({ success: true });
  });

  // Daily Cash
  app.get("/api/daily-cash", requirePermission("caixa_diario"), async (req, res) => {
    const data = await storage.getDailyCashList(getScopeId(req));
    res.json(data);
  });

  // Lightweight status endpoint — accessible to all authenticated users (e.g. Calculator indicator)
  app.get("/api/daily-cash/status", requireAuth, async (req, res) => {
    const userId = getScopeId(req);
    const BRAZIL_OFFSET_MS = -3 * 60 * 60 * 1000;
    const brazilNow = new Date(Date.now() + BRAZIL_OFFSET_MS);
    const today = brazilNow.toISOString().slice(0, 10);
    const todayCash = await storage.getTodayDailyCash(userId, today);
    const userSettings = await storage.getSettings(userId);
    res.json({
      isOpen: todayCash?.status === "aberto",
      todayCash: todayCash || null,
      autoCloseEnabled: userSettings.caixaAutoCloseEnabled || false,
      autoCloseTime: userSettings.caixaAutoCloseTime || null,
    });
  });

  app.get("/api/daily-cash/today", requireAuth, async (req, res) => {
    const userId = getScopeId(req);
    const today = new Date().toISOString().slice(0, 10);
    let data = await storage.getTodayDailyCash(userId, today);
    // Auto-open logic: only for admin users
    if (!data && req.session.isAdmin) {
      const userSettings = await storage.getSettings(userId);
      if (userSettings.caixaAutoOpenEnabled && userSettings.caixaAutoOpenTime) {
        const [autoHour, autoMin] = (userSettings.caixaAutoOpenTime || "08:00").split(":").map(Number);
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const autoMinutes = (autoHour || 8) * 60 + (autoMin || 0);
        if (currentMinutes >= autoMinutes) {
          data = await storage.createDailyCash({
            userId, date: today, status: "aberto",
            openingBalance: 0, totalIn: 0, totalOut: 0, closingBalance: 0,
            openedAt: new Date().toISOString(),
            openedByName: "",
            openType: "automatico",
            notes: "Abertura automática do sistema",
          });
        }
      }
    }
    res.json(data || null);
  });

  app.post("/api/daily-cash/open", requirePermission("caixa_diario"), async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Apenas administradores podem abrir o caixa." });
    const userId = getScopeId(req);
    const today = new Date().toISOString().slice(0, 10);
    const existing = await storage.getTodayDailyCash(userId, today);
    if (existing) return res.status(400).json({ message: "Caixa já aberto para hoje." });
    const dc = await storage.createDailyCash({
      userId, date: today, status: "aberto",
      openingBalance: Number(req.body.openingBalance) || 0,
      totalIn: 0, totalOut: 0, closingBalance: 0,
      openedAt: new Date().toISOString(),
      openedByName: req.session.username || "",
      openType: "manual",
      notes: req.body.notes || "",
    });
    res.json(dc);
  });

  app.post("/api/daily-cash/:id/reopen", requirePermission("caixa_diario"), async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Apenas administradores podem reabrir o caixa." });
    const userId = getScopeId(req);
    const dc = await storage.getDailyCashList(userId).then(list => list.find(d => d.id === req.params.id));
    if (!dc) return res.status(404).json({ message: "Caixa não encontrado" });
    if (dc.status !== "fechado") return res.status(400).json({ message: "Caixa não está fechado." });
    const updated = await storage.updateDailyCash(dc.id, userId, {
      status: "aberto",
      reopenedByName: req.session.username || "",
      reopenedAt: new Date().toISOString(),
      openType: "reabertura",
    });
    res.json(updated);
  });

  app.patch("/api/daily-cash/:id/close", requirePermission("caixa_diario"), async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Apenas administradores podem fechar o caixa." });
    const userId = getScopeId(req);
    const closedByUserId = req.session.userId!;
    const closedByName = req.session.username || "";
    const { reportedBalance, notes } = req.body;
    const dc = await storage.getDailyCashList(userId).then(list => list.find(d => d.id === req.params.id));
    if (!dc) return res.status(404).json({ message: "Caixa não encontrado" });
    const entries = await storage.getCashEntries(dc.userId);
    const periodEntries = entries.filter(e => e.date === dc.date && e.status !== "cancelado");
    const totalIn = periodEntries.filter(e => e.type === "entrada").reduce((s, e) => s + e.amount, 0);
    const totalOut = periodEntries.filter(e => e.type === "saida").reduce((s, e) => s + e.amount, 0);
    const byPayment: Record<string, number> = {};
    periodEntries.forEach(e => { byPayment[`${e.type}:${e.paymentMethod}`] = (byPayment[`${e.type}:${e.paymentMethod}`] || 0) + e.amount; });
    const closingBalance = dc.openingBalance + totalIn - totalOut;
    const diff = reportedBalance != null ? Number(reportedBalance) - closingBalance : undefined;
    const updated = await storage.updateDailyCash(dc.id, userId, {
      status: "fechado", totalIn, totalOut, closingBalance,
      reportedBalance: reportedBalance != null ? Number(reportedBalance) : undefined,
      difference: diff,
      closedAt: new Date().toISOString(),
      closedByUserId, closedByName,
      closeType: "manual",
      paymentSummary: byPayment,
      notes: notes || dc.notes || "",
    });
    res.json(updated);
  });

  // Cash Entries
  app.get("/api/cash-entries", requirePermission("livro_caixa"), async (req, res) => {
    const entries = await storage.getCashEntries(getScopeId(req));
    res.json(entries);
  });

  app.post("/api/cash-entries", requirePermission("livro_caixa"), async (req, res) => {
    try {
      const sellerUserId = getScopeId(req);
      const sellerName = req.session.username || "";
      const body = stripUserId(req.body);
      body.type = normalizeCashType(body.type);
      if (await isTodayCashClosed(sellerUserId)) {
        return res.status(409).json({ message: "O caixa de hoje está fechado. Reabra o caixa para registrar novos lançamentos." });
      }
      const openCash = await storage.getAnyOpenDailyCash();
      const userId = openCash ? openCash.userId : sellerUserId;
      const isSeller = openCash && openCash.userId !== sellerUserId;
      const entry = await storage.createCashEntry({
        ...body, userId,
        sellerUserId: isSeller ? sellerUserId : null,
        sellerName: isSeller ? sellerName : null,
      });
      res.json(entry);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/cash-entries/:id", requirePermission("livro_caixa"), async (req, res) => {
    try {
      const userId = getScopeId(req);
      const body = stripUserId(req.body);
      if (body.type !== undefined) body.type = normalizeCashType(body.type);
      const updated = await storage.updateCashEntry(req.params.id, userId, body);
      if (!updated) return res.status(404).json({ message: "Lançamento não encontrado" });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/cash-entries/:id", requirePermission("livro_caixa"), async (req, res) => {
    await storage.deleteCashEntry(req.params.id, getScopeId(req));
    res.json({ success: true });
  });

  // Cash Closings
  app.get("/api/cash-closings", requirePermission("livro_caixa"), async (req, res) => {
    const closings = await storage.getCashClosings(getScopeId(req));
    res.json(closings);
  });

  app.post("/api/cash-closings", requirePermission("livro_caixa"), async (req, res) => {
    const userId = getScopeId(req);
    const { periodLabel, periodStart, periodEnd, totalAmount, entryCount, notes, entryIds } = req.body;
    const closing = await storage.createCashClosing({
      userId, periodLabel, periodStart, periodEnd,
      totalAmount, entryCount: entryCount || 0,
      closedAt: new Date().toISOString(),
      notes: notes || ""
    });
    if (entryIds && entryIds.length > 0) {
      await storage.closeEntries(userId, closing.id, entryIds);
    }
    res.json(closing);
  });

  // ---- USER PERMISSIONS ----
  app.get("/api/user-permissions/:userId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const perms = await storage.getUserPermissions(req.params.userId);
      res.json({ userId: req.params.userId, permissions: perms });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/user-permissions/:userId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { permissions } = req.body;
      if (!Array.isArray(permissions)) return res.status(400).json({ message: "permissions deve ser um array" });
      const validModules = PERMISSION_MODULES.map(m => m.key);
      const filtered = permissions.filter((p: string) => validModules.includes(p as any));
      await storage.setUserPermissions(req.params.userId, filtered);
      // Update session permissions if the target user is currently logged in (best-effort)
      res.json({ userId: req.params.userId, permissions: filtered });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Startup: migrate existing users to roles + permissions ──────────────
  async function runRoleMigration() {
    try {
      const allUsers = await storage.getAllUsers() as any[];
      for (const u of allUsers) {
        const fullUser = await storage.getUserById(u.id);
        if (!fullUser) continue;
        if (fullUser.username === MASTER_ADMIN_USERNAME && (fullUser as any).role !== "super_admin") {
          await storage.updateUserRoleAndCompany(fullUser.id, "super_admin");
        } else if (fullUser.isAdmin && (fullUser as any).role === "company_admin") {
          // Already correct, nothing to do
        } else if (!fullUser.isAdmin && (fullUser as any).role === "company_admin") {
          // Legacy employee account — look up their company
          const empRecord = await storage.getEmployeeByLinkedUserId(fullUser.id);
          if (empRecord) {
            const cid = (fullUser as any).companyId || empRecord.userId;
            await storage.updateUserRoleAndCompany(fullUser.id, "employee", cid);
            const existing = await storage.getUserPermissions(fullUser.id);
            if (existing.length === 0) {
              await storage.setUserPermissions(fullUser.id, [...DEFAULT_EMPLOYEE_PERMISSIONS]);
            }
          }
        }
      }
      console.log("[RoleMigration] Completed.");
    } catch (e) {
      console.error("[RoleMigration] Error:", e);
    }
  }
  runRoleMigration().catch(console.error);

  // ─── Auto-open / Auto-close scheduler (runs every 60s) ────────────────────
  async function runCashScheduler() {
    const now = new Date();
    // Use Brazil time (UTC-3) for date and hour comparisons
    const BRAZIL_OFFSET_MS = -3 * 60 * 60 * 1000;
    const brazilNow = new Date(now.getTime() + BRAZIL_OFFSET_MS);
    const today = brazilNow.toISOString().slice(0, 10);
    const currentMin = brazilNow.getUTCHours() * 60 + brazilNow.getUTCMinutes();
    console.log(`[Scheduler] ${brazilNow.toISOString().slice(0, 16).replace("T", " ")} (BRT) — data: ${today} — min: ${currentMin}`);

    try {
      const adminUsers = await storage.getAdminUsers();
      for (const user of adminUsers) {
        try {
          const userSettings = await storage.getSettings(user.id);

          // ── Close stale open cashes from past dates ─────────────────────
          const allCashes = await storage.getDailyCashList(user.id);
          const staleCashes = allCashes.filter(dc => dc.status === "aberto" && dc.date < today);
          for (const stale of staleCashes) {
            const staleEntries = await storage.getCashEntries(user.id);
            const staleDayEntries = staleEntries.filter((e: any) => e.date === stale.date && e.status !== "cancelado");
            const staleIn = staleDayEntries.filter((e: any) => e.type === "entrada").reduce((s: number, e: any) => s + e.amount, 0);
            const staleOut = staleDayEntries.filter((e: any) => e.type === "saida").reduce((s: number, e: any) => s + e.amount, 0);
            const staleBalance = stale.openingBalance + staleIn - staleOut;
            await storage.updateDailyCash(stale.id, user.id, {
              status: "fechado", totalIn: staleIn, totalOut: staleOut,
              closingBalance: staleBalance, closedAt: now.toISOString(),
              closeType: "automatico", closedByName: null, closedByUserId: null,
              notes: (stale.notes ? stale.notes + "\n" : "") + "Fechado automaticamente (caixa de data anterior não encerrado).",
            });
            console.log(`[AutoClose] Caixa órfão de ${stale.date} (${user.username}) fechado automaticamente.`);
          }

          // ── Auto-open ──────────────────────────────────────────────────────
          if (userSettings.caixaAutoOpenEnabled && userSettings.caixaAutoOpenTime) {
            const [openH, openM] = (userSettings.caixaAutoOpenTime || "08:00").split(":").map(Number);
            const openMin = (openH || 8) * 60 + (openM || 0);
            console.log(`[AutoOpen] ${user.username}: openTime=${userSettings.caixaAutoOpenTime}(${openMin}min) currentMin=${currentMin} horaPassou=${currentMin >= openMin}`);
            if (currentMin >= openMin) {
              const existing = await storage.getTodayDailyCash(user.id, today);
              console.log(`[AutoOpen] ${user.username}: caixa hoje=${existing ? `${existing.status}` : "nenhum"}`);
              if (!existing) {
                await storage.createDailyCash({
                  userId: user.id, date: today, status: "aberto",
                  openingBalance: 0, totalIn: 0, totalOut: 0, closingBalance: 0,
                  openedAt: now.toISOString(),
                  openedByName: "",
                  openType: "automatico",
                  notes: "Abertura automática do sistema",
                });
                console.log(`[AutoOpen] ✅ Caixa aberto automaticamente para ${user.username}`);
              } else {
                console.log(`[AutoOpen] ⏭ Caixa já existe (${existing.status}) — não criando novo`);
              }
            }
          }

          // ── Auto-close ─────────────────────────────────────────────────────
          if (userSettings.caixaAutoCloseEnabled && userSettings.caixaAutoCloseTime) {
            const [closeH, closeM] = (userSettings.caixaAutoCloseTime || "19:00").split(":").map(Number);
            const closeMin = (closeH || 19) * 60 + (closeM || 0);
            if (currentMin >= closeMin) {
              const todayCash = await storage.getTodayDailyCash(user.id, today);
              if (todayCash && todayCash.status === "aberto") {
                const entries = await storage.getCashEntries(user.id);
                const periodEntries = entries.filter((e: any) => e.date === today && e.status !== "cancelado");
                const totalIn = periodEntries.filter((e: any) => e.type === "entrada").reduce((s: number, e: any) => s + e.amount, 0);
                const totalOut = periodEntries.filter((e: any) => e.type === "saida").reduce((s: number, e: any) => s + e.amount, 0);
                const byPayment: Record<string, number> = {};
                periodEntries.forEach((e: any) => {
                  const key = `${e.type}:${e.paymentMethod}`;
                  byPayment[key] = (byPayment[key] || 0) + e.amount;
                });
                const closingBalance = todayCash.openingBalance + totalIn - totalOut;
                await storage.updateDailyCash(todayCash.id, user.id, {
                  status: "fechado", totalIn, totalOut, closingBalance,
                  closedAt: now.toISOString(),
                  closeType: "automatico",
                  closedByName: null,
                  closedByUserId: null,
                  paymentSummary: byPayment,
                  notes: (() => {
                    const autoMsg = "Fechado automaticamente pelo sistema.";
                    if (!todayCash.notes) return autoMsg;
                    if (todayCash.notes.includes(autoMsg)) return todayCash.notes;
                    return todayCash.notes + "\n" + autoMsg;
                  })(),
                });
                console.log(`[AutoClose] Caixa de ${user.username} fechado automaticamente às ${now.toISOString()}`);
              }
            }
          }
        } catch (userErr) {
          console.error(`[Scheduler] Erro ao processar usuário ${user.username}:`, userErr);
        }
      }
    } catch (err) {
      console.error("[Scheduler] Erro geral:", err);
    }
  }
  // Run immediately on startup, then every 60s
  runCashScheduler().catch(err => console.error("[Scheduler] Erro na inicialização:", err));
  setInterval(runCashScheduler, 60000);

  return httpServer;
}
