import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Client = {
  id: string;
  name: string;
  whatsapp: string;
  document: string;
  email?: string;
  cep: string;
  neighborhood: string;
  street: string;
  number: string;
  complement: string;
  city: string;
  uf: string;
};

export type Material = {
  id: string;
  name: string;
  costPerKg: number;
};

export type StockItem = {
  id: string;
  materialId: string;
  brand: string;
  color: string;
  cost: number;
  quantity: number;
};

export type Employee = {
  id: string;
  name: string;
  commissionRate: number;
  linkedUserId?: string | null;
};

export type Calculation = {
  id: string;
  date: string;
  clientName: string;
  projectName: string;
  totalCost: number;
  suggestedPrice: number;
  status?: 'pending' | 'confirmed' | 'denied';
  employeeId?: string | null;
  employeeName?: string | null;
  details?: any;
};

export type Printer = {
  id: string;
  name: string;
  marketPrice: number;
  hourlyConsumption: number;
  depreciationPerHour: number;
};

export type AppSettings = {
  logoUrl: string | null;
  profitMargin: number;
  laborCostPerHour: number;
  kwhCost: number;
  printerPurchasePrice: number;
  printerLifespanHours: number;
  printerPowerWatts: number;
  selectedPrinterId: string | null;
  adminWhatsapp: string | null;
};

type AppStateContextType = {
  clients: Client[];
  inventory: Material[];
  stockItems: StockItem[];
  employees: Employee[];
  history: Calculation[];
  printers: Printer[];
  settings: AppSettings;
  loading: boolean;
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  addMaterial: (material: Omit<Material, 'id'>) => void;
  updateMaterial: (material: Material) => void;
  deleteMaterial: (id: string) => void;
  addStockItem: (item: Omit<StockItem, 'id'>) => void;
  updateStockItem: (item: StockItem) => void;
  deleteStockItem: (id: string) => void;
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<any>;
  updateEmployee: (employee: Employee) => void;
  deleteEmployee: (id: string) => void;
  addCalculation: (calc: Omit<Calculation, 'id' | 'date'>) => void;
  updateCalculation: (calc: Calculation) => void;
  deleteCalculation: (id: string) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  loadBackup: (data: { clients?: Client[], inventory?: Material[], stockItems?: StockItem[], history?: Calculation[], settings?: Partial<AppSettings> }) => void;
};

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

const defaultSettings: AppSettings = {
  logoUrl: null,
  profitMargin: 100,
  laborCostPerHour: 5.00,
  kwhCost: 0.90,
  printerPurchasePrice: 1200,
  printerLifespanHours: 6000,
  printerPowerWatts: 150,
  selectedPrinterId: 'c2',
  adminWhatsapp: null
};

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [inventory, setInventory] = useState<Material[]>([]);
  const [history, setHistory] = useState<Calculation[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const [printers] = useState<Printer[]>([
    { id: 'b1', name: 'Bambu Lab A1 Mini', marketPrice: 2000, hourlyConsumption: 0.15, depreciationPerHour: 0.33 },
    { id: 'b2', name: 'Bambu Lab A1', marketPrice: 3500, hourlyConsumption: 0.20, depreciationPerHour: 0.58 },
    { id: 'b3', name: 'Bambu Lab P1P', marketPrice: 5500, hourlyConsumption: 0.25, depreciationPerHour: 0.91 },
    { id: 'b4', name: 'Bambu Lab P1S', marketPrice: 6500, hourlyConsumption: 0.30, depreciationPerHour: 1.08 },
    { id: 'b5', name: 'Bambu Lab X1 Carbon', marketPrice: 12000, hourlyConsumption: 0.35, depreciationPerHour: 2.00 },
    { id: 'b6', name: 'Bambu Lab X1E', marketPrice: 18000, hourlyConsumption: 0.35, depreciationPerHour: 3.00 },
    { id: 'b7', name: 'Bambu Lab H2S', marketPrice: 8500, hourlyConsumption: 0.30, depreciationPerHour: 1.41 },
    { id: 'b8', name: 'Bambu Lab H2D', marketPrice: 9500, hourlyConsumption: 0.30, depreciationPerHour: 1.58 },
    { id: 'c1', name: 'Creality Ender 3', marketPrice: 1000, hourlyConsumption: 0.15, depreciationPerHour: 0.16 },
    { id: 'c2', name: 'Creality Ender 3 V2', marketPrice: 1200, hourlyConsumption: 0.15, depreciationPerHour: 0.20 },
    { id: 'c3', name: 'Creality Ender 3 V3 SE', marketPrice: 1800, hourlyConsumption: 0.25, depreciationPerHour: 0.30 },
    { id: 'c4', name: 'Creality Ender 3 V3 KE', marketPrice: 2800, hourlyConsumption: 0.35, depreciationPerHour: 0.46 },
    { id: 'c5', name: 'Creality K1', marketPrice: 4500, hourlyConsumption: 0.35, depreciationPerHour: 0.75 },
    { id: 'c6', name: 'Creality K1 Max', marketPrice: 6500, hourlyConsumption: 0.35, depreciationPerHour: 1.08 },
    { id: 'c7', name: 'Creality K1C', marketPrice: 5500, hourlyConsumption: 0.35, depreciationPerHour: 0.91 },
    { id: 'c8', name: 'Creality CR-10 SE', marketPrice: 3500, hourlyConsumption: 0.35, depreciationPerHour: 0.58 },
    { id: 'c9', name: 'Creality HALOT-MAGE', marketPrice: 2500, hourlyConsumption: 0.15, depreciationPerHour: 0.41 },
    { id: 's1', name: 'Snapmaker Artisan', marketPrice: 20000, hourlyConsumption: 0.30, depreciationPerHour: 3.33 },
    { id: 's2', name: 'Snapmaker J1s', marketPrice: 10000, hourlyConsumption: 0.30, depreciationPerHour: 1.66 },
    { id: 's3', name: 'Snapmaker A350T', marketPrice: 12000, hourlyConsumption: 0.30, depreciationPerHour: 2.00 },
    { id: 's4', name: 'Snapmaker U1', marketPrice: 15000, hourlyConsumption: 0.30, depreciationPerHour: 2.50 },
    { id: 'e1', name: 'Elegoo Neptune 3 Pro', marketPrice: 1800, hourlyConsumption: 0.20, depreciationPerHour: 0.30 },
    { id: 'e2', name: 'Elegoo Neptune 4', marketPrice: 2200, hourlyConsumption: 0.20, depreciationPerHour: 0.36 },
    { id: 'e3', name: 'Elegoo Neptune 4 Pro', marketPrice: 2500, hourlyConsumption: 0.20, depreciationPerHour: 0.41 },
    { id: 'e4', name: 'Elegoo Neptune 4 Plus', marketPrice: 3200, hourlyConsumption: 0.30, depreciationPerHour: 0.53 },
    { id: 'e5', name: 'Elegoo Neptune 4 Max', marketPrice: 4200, hourlyConsumption: 0.30, depreciationPerHour: 0.70 },
    { id: 'e6', name: 'Elegoo Saturn 3', marketPrice: 3500, hourlyConsumption: 0.15, depreciationPerHour: 0.58 },
    { id: 'e7', name: 'Elegoo Mars 4', marketPrice: 2000, hourlyConsumption: 0.10, depreciationPerHour: 0.33 },
    { id: 'p1', name: 'Prusa i3 MK4', marketPrice: 8000, hourlyConsumption: 0.25, depreciationPerHour: 1.33 },
    { id: 'a1', name: 'Anycubic Kobra 2 Max', marketPrice: 3800, hourlyConsumption: 0.40, depreciationPerHour: 0.63 }
  ]);

  useEffect(() => {
    Promise.all([
      api('/api/clients'),
      api('/api/materials'),
      api('/api/stock-items'),
      api('/api/employees'),
      api('/api/calculations'),
      api('/api/settings'),
    ]).then(([c, m, s, emp, h, set]) => {
      setClients(c);
      setInventory(m);
      setStockItems(s);
      setEmployees(emp);
      setHistory(h);
      if (set) {
        setSettings({
          logoUrl: set.logoUrl || null,
          profitMargin: set.profitMargin ?? 100,
          laborCostPerHour: set.laborCostPerHour ?? 5,
          kwhCost: set.kwhCost ?? 0.9,
          printerPurchasePrice: set.printerPurchasePrice ?? 1200,
          printerLifespanHours: set.printerLifespanHours ?? 6000,
          printerPowerWatts: set.printerPowerWatts ?? 150,
          selectedPrinterId: set.selectedPrinterId || 'c2',
          adminWhatsapp: set.adminWhatsapp || null,
        });
      }
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load data:', err);
      setLoading(false);
    });
  }, []);

  const addClient = useCallback(async (client: Omit<Client, 'id'>) => {
    try {
      const created = await api('/api/clients', { method: 'POST', body: JSON.stringify(client) });
      setClients(prev => [...prev, created]);
    } catch (e) { console.error(e); }
  }, []);

  const updateClient = useCallback(async (updatedClient: Client) => {
    try {
      const { id, ...rest } = updatedClient;
      const updated = await api(`/api/clients/${id}`, { method: 'PATCH', body: JSON.stringify(rest) });
      setClients(prev => prev.map(c => c.id === id ? updated : c));
    } catch (e) { console.error(e); }
  }, []);

  const deleteClient = useCallback(async (id: string) => {
    try {
      await api(`/api/clients/${id}`, { method: 'DELETE' });
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error(e); }
  }, []);

  const addMaterial = useCallback(async (material: Omit<Material, 'id'>) => {
    try {
      const created = await api('/api/materials', { method: 'POST', body: JSON.stringify(material) });
      setInventory(prev => [...prev, created]);
    } catch (e) { console.error(e); }
  }, []);

  const updateMaterial = useCallback(async (updatedMaterial: Material) => {
    try {
      const { id, ...rest } = updatedMaterial;
      const updated = await api(`/api/materials/${id}`, { method: 'PATCH', body: JSON.stringify(rest) });
      setInventory(prev => prev.map(m => m.id === id ? updated : m));
    } catch (e) { console.error(e); }
  }, []);

  const deleteMaterial = useCallback(async (id: string) => {
    try {
      await api(`/api/materials/${id}`, { method: 'DELETE' });
      setInventory(prev => prev.filter(m => m.id !== id));
    } catch (e) { console.error(e); }
  }, []);

  const addCalculation = useCallback(async (calc: Omit<Calculation, 'id' | 'date'>) => {
    try {
      const created = await api('/api/calculations', { 
        method: 'POST', 
        body: JSON.stringify({ ...calc, date: new Date().toISOString(), status: calc.status || 'pending' }) 
      });
      setHistory(prev => [created, ...prev]);
    } catch (e) { console.error(e); }
  }, []);

  const updateCalculation = useCallback(async (updatedCalc: Calculation) => {
    try {
      const { id, ...rest } = updatedCalc;
      const updated = await api(`/api/calculations/${id}`, { method: 'PATCH', body: JSON.stringify(rest) });
      setHistory(prev => prev.map(c => c.id === id ? updated : c));
    } catch (e) { console.error(e); }
  }, []);

  const deleteCalculation = useCallback(async (id: string) => {
    try {
      await api(`/api/calculations/${id}`, { method: 'DELETE' });
      setHistory(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error(e); }
  }, []);

  const addStockItem = useCallback(async (item: Omit<StockItem, 'id'>) => {
    try {
      const created = await api('/api/stock-items', { method: 'POST', body: JSON.stringify(item) });
      setStockItems(prev => [...prev, created]);
    } catch (e) { console.error(e); }
  }, []);

  const updateStockItem = useCallback(async (updatedItem: StockItem) => {
    try {
      const { id, ...rest } = updatedItem;
      const updated = await api(`/api/stock-items/${id}`, { method: 'PATCH', body: JSON.stringify(rest) });
      setStockItems(prev => prev.map(s => s.id === id ? updated : s));
    } catch (e) { console.error(e); }
  }, []);

  const deleteStockItem = useCallback(async (id: string) => {
    try {
      await api(`/api/stock-items/${id}`, { method: 'DELETE' });
      setStockItems(prev => prev.filter(s => s.id !== id));
    } catch (e) { console.error(e); }
  }, []);

  const addEmployee = useCallback(async (employee: Omit<Employee, 'id'>) => {
    try {
      const created = await api('/api/employees', { method: 'POST', body: JSON.stringify(employee) });
      setEmployees(prev => [...prev, created]);
      return created;
    } catch (e) { console.error(e); return null; }
  }, []);

  const updateEmployee = useCallback(async (updatedEmployee: Employee) => {
    try {
      const { id, ...rest } = updatedEmployee;
      const updated = await api(`/api/employees/${id}`, { method: 'PATCH', body: JSON.stringify(rest) });
      setEmployees(prev => prev.map(e => e.id === id ? updated : e));
    } catch (e) { console.error(e); }
  }, []);

  const deleteEmployee = useCallback(async (id: string) => {
    try {
      await api(`/api/employees/${id}`, { method: 'DELETE' });
      setEmployees(prev => prev.filter(e => e.id !== id));
    } catch (e) { console.error(e); }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    try {
      const updated = await api('/api/settings', { method: 'PATCH', body: JSON.stringify(newSettings) });
      setSettings({
        logoUrl: updated.logoUrl || null,
        profitMargin: updated.profitMargin ?? 100,
        laborCostPerHour: updated.laborCostPerHour ?? 5,
        kwhCost: updated.kwhCost ?? 0.9,
        printerPurchasePrice: updated.printerPurchasePrice ?? 1200,
        printerLifespanHours: updated.printerLifespanHours ?? 6000,
        printerPowerWatts: updated.printerPowerWatts ?? 150,
        selectedPrinterId: updated.selectedPrinterId || 'c2',
        adminWhatsapp: updated.adminWhatsapp || null,
      });
    } catch (e) { console.error(e); }
  }, []);

  const loadBackup = useCallback(async (data: { clients?: Client[], inventory?: Material[], stockItems?: StockItem[], history?: Calculation[], settings?: Partial<AppSettings> }) => {
    try {
      await api('/api/backup/import', { method: 'POST', body: JSON.stringify(data) });
      const [c, m, s, h, set] = await Promise.all([
        api('/api/clients'),
        api('/api/materials'),
        api('/api/stock-items'),
        api('/api/calculations'),
        api('/api/settings'),
      ]);
      setClients(c);
      setInventory(m);
      setStockItems(s);
      setHistory(h);
      if (set) {
        setSettings({
          logoUrl: set.logoUrl || null,
          profitMargin: set.profitMargin ?? 100,
          laborCostPerHour: set.laborCostPerHour ?? 5,
          kwhCost: set.kwhCost ?? 0.9,
          printerPurchasePrice: set.printerPurchasePrice ?? 1200,
          printerLifespanHours: set.printerLifespanHours ?? 6000,
          printerPowerWatts: set.printerPowerWatts ?? 150,
          selectedPrinterId: set.selectedPrinterId || 'c2',
          adminWhatsapp: set.adminWhatsapp || null,
        });
      }
    } catch (e) { console.error(e); }
  }, []);

  return (
    <AppStateContext.Provider value={{
      clients, inventory, stockItems, employees, history, printers, settings, loading,
      addClient, updateClient, deleteClient,
      addMaterial, updateMaterial, deleteMaterial,
      addStockItem, updateStockItem, deleteStockItem,
      addEmployee, updateEmployee, deleteEmployee,
      addCalculation, updateCalculation, deleteCalculation, updateSettings, loadBackup
    }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
