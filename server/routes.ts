import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import session from "express-session";

declare module "express-session" {
  interface SessionData {
    userId: string;
    username: string;
    isAdmin: boolean;
    isMasterAdmin: boolean;
  }
}

const MASTER_ADMIN_USERNAME = "hcorbage";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Não autorizado" });
}

function stripUserId(body: any) {
  const { userId, user_id, id, ...rest } = body || {};
  return rest;
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
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.isAdmin = isAdmin;
      req.session.isMasterAdmin = user.username === MASTER_ADMIN_USERNAME;
      return res.json({ id: user.id, username: user.username, isAdmin, isMasterAdmin: req.session.isMasterAdmin, mustChangePassword: user.mustChangePassword || false });
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
      return res.json({ id: req.session.userId, username: req.session.username, isAdmin: req.session.isAdmin || false, isMasterAdmin: req.session.isMasterAdmin || false });
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

  const requireMasterAdmin: RequestHandler = (req, res, next) => {
    if (!req.session || !req.session.isMasterAdmin) {
      return res.status(403).json({ message: "Acesso restrito ao administrador." });
    }
    next();
  };

  // ---- USER MANAGEMENT (admin only) ----
  app.get("/api/users", requireAuth, requireMasterAdmin, async (_req, res) => {
    const usersList = await storage.getAllUsers();
    res.json(usersList);
  });

  app.post("/api/users", requireAuth, requireMasterAdmin, async (req, res) => {
    try {
      const { username, password, passwordHint, cpf, birthdate } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Usuário e senha são obrigatórios." });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres." });
      }
      if (!cpf || !birthdate) {
        return res.status(400).json({ message: "CPF e data de nascimento são obrigatórios." });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Este usuário já existe." });
      }
      const hashed = await bcrypt.hash(password, 10);
      const userData: any = { username, password: hashed, isAdmin: true, passwordHint: passwordHint || null };
      userData.cpf = cpf.replace(/\D/g, '');
      userData.birthdate = birthdate;
      const user = await storage.createUser(userData);
      await seedMaterialsForUser(user.id);
      return res.json({ id: user.id, username: user.username });
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
  app.use("/api/backup", requireAuth);

  // ---- CLIENTS ----
  app.get("/api/clients", async (req, res) => {
    const data = await storage.getClients(req.session.userId!);
    res.json(data);
  });
  app.post("/api/clients", async (req, res) => {
    const client = await storage.createClient({ ...stripUserId(req.body), userId: req.session.userId! });
    res.json(client);
  });
  app.patch("/api/clients/:id", async (req, res) => {
    const client = await storage.updateClient(req.params.id, req.session.userId!, stripUserId(req.body));
    res.json(client);
  });
  app.delete("/api/clients/:id", async (req, res) => {
    await storage.deleteClient(req.params.id, req.session.userId!);
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
  app.get("/api/stock-items", async (req, res) => {
    const data = await storage.getStockItems(req.session.userId!);
    res.json(data);
  });
  app.post("/api/stock-items", async (req, res) => {
    const item = await storage.createStockItem({ ...stripUserId(req.body), userId: req.session.userId! });
    res.json(item);
  });
  app.patch("/api/stock-items/:id", async (req, res) => {
    const item = await storage.updateStockItem(req.params.id, req.session.userId!, stripUserId(req.body));
    res.json(item);
  });
  app.delete("/api/stock-items/:id", async (req, res) => {
    await storage.deleteStockItem(req.params.id, req.session.userId!);
    res.json({ ok: true });
  });

  // ---- EMPLOYEES ----
  app.get("/api/employees", async (req, res) => {
    if (req.session.isAdmin) {
      const data = await storage.getEmployees(req.session.userId!);
      res.json(data);
    } else {
      const emp = await storage.getEmployeeByLinkedUserId(req.session.userId!);
      res.json(emp ? [emp] : []);
    }
  });
  app.post("/api/employees", requireMasterAdmin, async (req, res) => {
    try {
      const body = stripUserId(req.body);
      const emp = await storage.createEmployee({ ...body, userId: req.session.userId! });
      
      const firstName = body.name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
      let username = firstName;
      let counter = 1;
      while (await storage.getUserByUsername(username)) {
        username = `${firstName}${counter}`;
        counter++;
      }
      
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let tempPassword = '';
      for (let i = 0; i < 6; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const hashed = await bcrypt.hash(tempPassword, 10);
      const user = await storage.createUser({ username, password: hashed, isAdmin: false, mustChangePassword: true });
      await seedMaterialsForUser(user.id);
      
      await storage.updateEmployee(emp.id, req.session.userId!, { linkedUserId: user.id });
      
      res.json({ ...emp, linkedUserId: user.id, generatedUsername: username, generatedPassword: tempPassword });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
  app.patch("/api/employees/:id", requireMasterAdmin, async (req, res) => {
    const emp = await storage.updateEmployee(req.params.id, req.session.userId!, stripUserId(req.body));
    res.json(emp);
  });
  app.delete("/api/employees/:id", requireMasterAdmin, async (req, res) => {
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

  // ---- SETTINGS ----
  app.get("/api/settings", async (req, res) => {
    const data = await storage.getSettings(req.session.userId!);
    if (!req.session.isAdmin && !data.logoUrl) {
      const admins = await storage.getAdminUsers();
      if (admins.length > 0) {
        const adminSettings = await storage.getSettings(admins[0].id);
        if (adminSettings.logoUrl) {
          data.logoUrl = adminSettings.logoUrl;
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

  return httpServer;
}
