import { useState, useRef, useEffect, useCallback } from "react";
import { useAppState } from "../context/AppState";
import { useAuth } from "../context/AuthContext";
import { Save, Upload, Info, Download, UploadCloud, UserPlus, Trash2, Key, Edit2, BadgeDollarSign, Phone, X, ZoomIn, ZoomOut, Check, Sun, Moon, Monitor, Shield, Clock, ChevronDown, Ban, Infinity as InfinityIcon, FlaskConical, CalendarDays, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { PERMISSION_MODULES } from "@shared/modules";
import { validateCPF_CNPJ } from "@shared/validators";
import { useCNPJLookup } from "@/hooks/useCNPJLookup";
import { useTheme, type ThemeMode } from "../context/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatCPF_CNPJ(value: string) {
  const v = value.replace(/\D/g, "");
  if (v.length <= 11) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}
function formatCEP(value: string) { return value.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2"); }
function formatPhone(value: string) { return value.replace(/\D/g, "").replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3"); }
function generateLoginPreview(name: string, birthdate: string): string {
  const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
  if (parts.length === 0 || !birthdate) return '';
  const first = parts[0].charAt(0).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
  const year = new Date(birthdate + 'T12:00:00').getFullYear();
  if (isNaN(year)) return '';
  return `${first}${last}${year}`;
}

export default function Settings() {
  const { settings, updateSettings, printers, clients, inventory, stockItems, history, employees, addEmployee, updateEmployee, deleteEmployee, loadBackup } = useAppState();
  const { isMasterAdmin } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  type UserAccount = {
    id: string;
    username: string;
    role: string;
    trial: boolean | null;
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    accessStatus: string;
    mustChangePassword: boolean;
    email: string | null;
  };
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [accessStatusEditing, setAccessStatusEditing] = useState<string | null>(null);
  const [accessStatusSaving, setAccessStatusSaving] = useState(false);
  const [trialEndDateEdit, setTrialEndDateEdit] = useState<string>("");
  const [emailEditValues, setEmailEditValues] = useState<Record<string, string>>({});
  const [emailSavingId, setEmailSavingId] = useState<string | null>(null);
  const [emailEditingId, setEmailEditingId] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPasswordId, setChangingPasswordId] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [changedPassword, setChangedPassword] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [editEmpName, setEditEmpName] = useState("");
  const [editEmpRate, setEditEmpRate] = useState("");
  const [newUserHint, setNewUserHint] = useState("");
  const [newUserCpf, setNewUserCpf] = useState("");
  const [newUserBirthdate, setNewUserBirthdate] = useState("");
  const [changePasswordHint, setChangePasswordHint] = useState("");
  const [permissionsModal, setPermissionsModal] = useState<{ empName: string; linkedUserId: string; perms: string[] } | null>(null);
  const [permsSaving, setPermsSaving] = useState(false);

  const openPermissionsModal = async (emp: any) => {
    if (!emp.linkedUserId) return;
    try {
      const r = await fetch(`/api/user-permissions/${emp.linkedUserId}`);
      const d = await r.json();
      setPermissionsModal({ empName: emp.name, linkedUserId: emp.linkedUserId, perms: d.permissions || [] });
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar permissões.", variant: "destructive" });
    }
  };

  const savePermissions = async () => {
    if (!permissionsModal) return;
    setPermsSaving(true);
    try {
      const r = await fetch(`/api/user-permissions/${permissionsModal.linkedUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: permissionsModal.perms }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      setPermissionsModal(null);
      toast({ title: "Permissões salvas", description: `Permissões de ${permissionsModal.empName} atualizadas.` });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setPermsSaving(false);
    }
  };

  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [empForm, setEmpForm] = useState({ name: "", document: "", email: "", whatsapp: "", commissionRate: "", birthdate: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", uf: "" });
  const [empDocError, setEmpDocError] = useState("");
  const empCNPJ = useCNPJLookup();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", document: "", email: "", whatsapp: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", uf: "", birthdate: "", password: "", passwordHint: "" });
  const [userDocError, setUserDocError] = useState("");
  const userCNPJ = useCNPJLookup();
  const [credentialsModal, setCredentialsModal] = useState<{ username: string; password: string; whatsapp: string; name: string; type?: 'employee' | 'user' } | null>(null);
  type ResetModalType = 'system' | 'company' | null;
  const SELECTIVE_MODULES = [
    { id: "clients",        label: "Clientes",                                        tables: "clients" },
    { id: "orders",         label: "Pedidos / Vendas",                                tables: "calculations" },
    { id: "orderFinancials",label: "Financeiro por pedido",                           tables: "order_financials" },
    { id: "payments",       label: "Pagamentos",                                      tables: "order_payments" },
    { id: "dailyCash",      label: "Caixa diário",                                    tables: "daily_cash" },
    { id: "cashEntries",    label: "Livro Caixa / Cash Entries",                      tables: "cash_entries" },
    { id: "cashClosings",   label: "Fechamentos de caixa",                            tables: "cash_closings" },
    { id: "stock",          label: "Estoque / Materiais / Movimentações",             tables: "stock_items, stock_movements, materials, brands" },
    { id: "employees",      label: "Funcionários / Usuários operacionais",            tables: "employees + user accounts vinculados" },
    { id: "adminAccounts",  label: "Contas de admins/usuários de teste (exceto super admin)", tables: "users (company_admin)" },
    { id: "permissions",    label: "Permissões de usuários",                          tables: "user_permissions" },
  ] as const;

  const [selectiveOpen, setSelectiveOpen] = useState(false);
  const [selectiveModules, setSelectiveModules] = useState<Set<string>>(new Set());
  const [selectiveAll, setSelectiveAll] = useState(false);
  const [selectivePassword, setSelectivePassword] = useState("");
  const [selectiveShowPassword, setSelectiveShowPassword] = useState(false);
  const [selectiveConfirmText, setSelectiveConfirmText] = useState("");
  const [selectiveLoading, setSelectiveLoading] = useState(false);
  const [selectiveError, setSelectiveError] = useState("");

  const toggleSelectiveModule = (id: string) => {
    setSelectiveModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSelectiveAll(false);
  };
  const toggleSelectiveAll = () => {
    if (selectiveAll) {
      setSelectiveAll(false);
      setSelectiveModules(new Set());
    } else {
      setSelectiveAll(true);
      setSelectiveModules(new Set(SELECTIVE_MODULES.map(m => m.id)));
    }
  };
  const closeSelectiveModal = () => {
    setSelectiveOpen(false);
    setSelectivePassword("");
    setSelectiveConfirmText("");
    setSelectiveError("");
  };
  const handleSelectiveReset = async () => {
    if (selectiveConfirmText !== "RESETAR SISTEMA") {
      setSelectiveError("Digite exatamente: RESETAR SISTEMA");
      return;
    }
    if (!selectivePassword) { setSelectiveError("Senha obrigatória."); return; }
    const chosen = selectiveAll ? ["all"] : Array.from(selectiveModules);
    if (chosen.length === 0) { setSelectiveError("Selecione ao menos um módulo."); return; }
    setSelectiveLoading(true);
    setSelectiveError("");
    try {
      const res = await fetch("/api/admin/reset-selective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: chosen, password: selectivePassword, confirmText: selectiveConfirmText }),
      });
      const data = await res.json();
      if (!res.ok) { setSelectiveError(data.message || "Erro ao executar reset."); }
      else { closeSelectiveModal(); setSelectiveModules(new Set()); setSelectiveAll(false); toast({ title: "Reset concluído", description: data.message }); }
    } catch { setSelectiveError("Erro de conexão."); }
    finally { setSelectiveLoading(false); }
  };

  const [resetModalType, setResetModalType] = useState<ResetModalType>(null);
  const [resetTargetUserId, setResetTargetUserId] = useState("");
  const [resetLockedCompany, setResetLockedCompany] = useState<{id: string, name: string} | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetShowPassword, setResetShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  const openResetModal = (type: 'system' | 'company') => {
    if (type === 'company') {
      if (!resetTargetUserId) {
        toast({ title: "Selecione uma empresa", description: "Escolha uma empresa na lista antes de resetar.", variant: "destructive" });
        return;
      }
      const company = usersList.find(u => String(u.id) === String(resetTargetUserId));
      setResetLockedCompany(company ? { id: String(company.id), name: company.username } : { id: resetTargetUserId, name: resetTargetUserId });
    }
    setResetModalType(type);
    setResetPassword("");
    setResetConfirmText("");
    setResetShowPassword(false);
    setResetError("");
  };
  const closeResetModal = () => {
    setResetModalType(null);
    setResetPassword("");
    setResetConfirmText("");
    setResetError("");
    setResetLockedCompany(null);
  };

  const handleReset = async () => {
    const expectedText = resetModalType === 'system' ? "RESETAR SISTEMA" : "RESETAR EMPRESA";
    if (resetConfirmText !== expectedText) {
      setResetError(`Digite exatamente: ${expectedText}`);
      return;
    }
    if (!resetPassword) {
      setResetError("Senha obrigatória.");
      return;
    }
    if (resetModalType === 'company' && !resetLockedCompany) {
      setResetError("Empresa não identificada. Feche e selecione novamente.");
      return;
    }
    setResetLoading(true);
    setResetError("");
    try {
      const endpoint = resetModalType === 'system' ? "/api/admin/reset-system" : "/api/admin/reset-company";
      const body: any = { password: resetPassword, confirmText: resetConfirmText };
      if (resetModalType === 'company') body.targetUserId = resetLockedCompany!.id;
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.message || "Erro ao executar reset.");
      } else {
        closeResetModal();
        setResetTargetUserId("");
        toast({ title: "Reset concluído", description: data.message });
      }
    } catch {
      setResetError("Erro de conexão.");
    } finally {
      setResetLoading(false);
    }
  };

  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.id) setCurrentUserId(d.id);
      if (d.isAdmin) setIsAdmin(true);
    });
  }, []);

  useEffect(() => {
    if (isMasterAdmin) {
      fetch("/api/users").then(r => r.json()).then(setUsersList).catch(() => {});
    }
  }, [isMasterAdmin]);

  const handleAddUser = async () => {
    if (!userForm.name.trim()) {
      toast({ title: "Erro", description: "Nome completo é obrigatório.", variant: "destructive" });
      return;
    }
    if (!userForm.document.replace(/\D/g, '')) {
      toast({ title: "Erro", description: "CPF/CNPJ é obrigatório.", variant: "destructive" });
      return;
    }
    const userDocValidation = validateCPF_CNPJ(userForm.document);
    if (!userDocValidation.valid) {
      setUserDocError(userDocValidation.message);
      toast({ title: "Erro", description: userDocValidation.message, variant: "destructive" });
      return;
    }
    if (!userForm.birthdate) {
      toast({ title: "Erro", description: "Data de nascimento é obrigatória.", variant: "destructive" });
      return;
    }
    const body: any = {
      username: userForm.name.trim(),
      cpf: userForm.document,
      birthdate: userForm.birthdate,
      email: userForm.email || "",
      whatsapp: userForm.whatsapp || "",
      cep: userForm.cep || "",
      street: userForm.street || "",
      number: userForm.number || "",
      complement: userForm.complement || "",
      neighborhood: userForm.neighborhood || "",
      city: userForm.city || "",
      uf: userForm.uf || "",
    };
    const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Erro", description: data.message, variant: "destructive" });
      return;
    }
    setUsersList([...usersList, { id: data.id, username: data.username, role: "company_admin", trial: true, trialStartedAt: null, trialEndsAt: null, accessStatus: "trial", mustChangePassword: true, email: null }]);
    setUserModalOpen(false);
    setCredentialsModal({ username: data.generatedLogin || data.username, password: data.tempPassword, whatsapp: userForm.whatsapp || "", name: userForm.name.trim(), type: 'user' });
    setUserForm({ name: "", document: "", email: "", whatsapp: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", uf: "", birthdate: "", password: "", passwordHint: "" });
    toast({ title: "Sucesso", description: "Usuário criado com sucesso." });
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Erro", description: data.message, variant: "destructive" });
      return;
    }
    setUsersList(usersList.filter(u => u.id !== id));
    toast({ title: "Sucesso", description: "Usuário excluído." });
  };

  const handleUpdateAccessStatus = async (id: string, newStatus: string, trialEndsAt?: string) => {
    setAccessStatusSaving(true);
    try {
      const body: any = { accessStatus: newStatus };
      if (trialEndsAt) body.trialEndsAt = trialEndsAt;
      const res = await fetch(`/api/users/${id}/access-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao atualizar status.");
      setUsersList(usersList.map(u => u.id === id ? {
        ...u,
        accessStatus: newStatus,
        trialEndsAt: trialEndsAt || u.trialEndsAt,
      } : u));
      setAccessStatusEditing(null);
      setTrialEndDateEdit("");
      const statusLabel = newStatus === "trial" ? "Trial" : newStatus === "full" ? "Full" : "Bloqueado";
      toast({ title: "Status atualizado", description: `Acesso alterado para ${statusLabel}.` });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setAccessStatusSaving(false);
    }
  };

  const handleSaveEmail = async (userId: string) => {
    const email = emailEditValues[userId] ?? "";
    setEmailSavingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}/email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao salvar email.");
      setUsersList(usersList.map(u => u.id === userId ? { ...u, email: data.email || null } : u));
      toast({ title: "Email salvo", description: email.trim() ? `Email atualizado: ${email.trim()}` : "Email removido da conta." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setEmailSavingId(null);
    }
  };

  const handleChangePassword = async (id: string) => {
    if (changedPassword.length < 6) {
      toast({ title: "Erro", description: "A nova senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    const body: any = { newPassword: changedPassword };
    if (id === currentUserId) body.currentPassword = currentPassword;
    if (changePasswordHint.trim()) body.passwordHint = changePasswordHint.trim();
    const res = await fetch(`/api/users/${id}/password`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Erro", description: data.message, variant: "destructive" });
      return;
    }
    setChangingPasswordId(null);
    setCurrentPassword("");
    setChangedPassword("");
    setChangePasswordHint("");
    toast({ title: "Sucesso", description: "Senha alterada com sucesso." });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCropperSrc(url);
      setCropZoom(1);
      setCropPos({ x: 0, y: 0 });
      setCropperOpen(true);
    }
    if (e.target) e.target.value = '';
  };

  const drawCropPreview = useCallback(() => {
    const canvas = cropCanvasRef.current;
    const img = cropImgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    const size = 300;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, size, size);
    const baseScale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
    const scale = baseScale * cropZoom;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const x = (size - w) / 2 + cropPos.x;
    const y = (size - h) / 2 + cropPos.y;
    ctx.drawImage(img, x, y, w, h);
  }, [cropZoom, cropPos]);

  useEffect(() => {
    if (cropperOpen) drawCropPreview();
  }, [cropperOpen, drawCropPreview]);

  const handleCropConfirm = () => {
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png', 0.9);
    setLocalSettings({ ...localSettings, logoUrl: dataUrl });
    setCropperOpen(false);
    setCropperSrc(null);
  };

  const handleCropMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - cropPos.x, y: clientY - cropPos.y });
  };

  const handleCropMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const newPos = { x: clientX - dragStart.x, y: clientY - dragStart.y };
    setCropPos(newPos);
  }, [isDragging, dragStart]);

  const handleCropMouseUp = () => setIsDragging(false);

  const saveSettings = async () => {
    try {
      await updateSettings(localSettings);
      toast({
        title: "Sucesso",
        description: "Ajustes salvos com sucesso.",
      });
    } catch (e) {
      toast({
        title: "Erro",
        description: "Falha ao salvar os ajustes.",
        variant: "destructive",
      });
    }
  };

  const handleExportBackup = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      const wsSettings = XLSX.utils.json_to_sheet([localSettings]);
      XLSX.utils.book_append_sheet(wb, wsSettings, "Configuracoes");
      
      const wsClients = XLSX.utils.json_to_sheet(clients);
      XLSX.utils.book_append_sheet(wb, wsClients, "Clientes");
      
      const wsInventory = XLSX.utils.json_to_sheet(inventory);
      XLSX.utils.book_append_sheet(wb, wsInventory, "Inventario");
      
      const wsStock = XLSX.utils.json_to_sheet(stockItems);
      XLSX.utils.book_append_sheet(wb, wsStock, "Estoque");
      
      const wsHistory = XLSX.utils.json_to_sheet(history);
      XLSX.utils.book_append_sheet(wb, wsHistory, "Historico");

      XLSX.writeFile(wb, `C3D_Backup_${format(new Date(), 'dd-MM-yyyy_HHmm')}.xlsx`);
      
      toast({ title: "Backup Exportado", description: "O arquivo Excel foi baixado com sucesso." });
    } catch (error) {
      console.error("Erro ao exportar", error);
      toast({ title: "Erro", description: "Falha ao gerar o arquivo de backup.", variant: "destructive" });
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const backupData: any = {};
        
        if (workbook.SheetNames.includes("Configuracoes")) {
          const settingsRows = XLSX.utils.sheet_to_json(workbook.Sheets["Configuracoes"]);
          if (settingsRows.length > 0) backupData.settings = settingsRows[0];
        }
        if (workbook.SheetNames.includes("Clientes")) {
          backupData.clients = XLSX.utils.sheet_to_json(workbook.Sheets["Clientes"]);
        }
        if (workbook.SheetNames.includes("Inventario")) {
          backupData.inventory = XLSX.utils.sheet_to_json(workbook.Sheets["Inventario"]);
        }
        if (workbook.SheetNames.includes("Estoque")) {
          backupData.stockItems = XLSX.utils.sheet_to_json(workbook.Sheets["Estoque"]);
        }
        if (workbook.SheetNames.includes("Historico")) {
          backupData.history = XLSX.utils.sheet_to_json(workbook.Sheets["Historico"]);
        }

        loadBackup(backupData);
        setLocalSettings(backupData.settings || settings);
        
        toast({ title: "Sucesso!", description: "Backup restaurado com sucesso." });
      } catch (error) {
        console.error("Erro ao importar", error);
        toast({ title: "Erro de Importação", description: "O arquivo selecionado não é um backup válido.", variant: "destructive" });
      }
      
      if (backupInputRef.current) backupInputRef.current.value = "";
    };
    reader.readAsArrayBuffer(file);
  };

  const selectedPrinter = printers.find(p => p.id === localSettings.selectedPrinterId);

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">{isAdmin ? "Ajustes do Sistema" : "Minha Conta"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{isAdmin ? "Configure suas preferências, custos e logotipo" : "Selecione sua impressora e gerencie sua senha"}</p>
          </div>
          {isAdmin && (
            <button 
              onClick={saveSettings}
              className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Save className="w-5 h-5" />
              Salvar Ajustes
            </button>
          )}
        </div>

        {/* ── Aparência (visible to all users) ── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary" />
            Aparência
          </h2>
          <p className="text-xs text-gray-500 mb-4">Escolha o tema do sistema. A preferência é salva neste dispositivo.</p>
          <div className="flex gap-3">
            {([
              { value: "light" as ThemeMode, label: "Claro", icon: Sun, desc: "Sempre tema claro" },
              { value: "dark"  as ThemeMode, label: "Escuro", icon: Moon, desc: "Sempre tema escuro" },
              { value: "system" as ThemeMode, label: "Sistema", icon: Monitor, desc: "Segue o dispositivo" },
            ] as { value: ThemeMode; label: string; icon: typeof Sun; desc: string }[]).map(({ value, label, icon: Icon, desc }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  data-testid={`button-theme-${value}`}
                  className={`flex-1 flex flex-col items-center gap-2 py-4 px-2 rounded-xl border-2 transition-all text-center ${
                    active
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-gray-400"}`} />
                  <span className={`text-xs font-semibold ${active ? "text-primary" : "text-gray-700"}`}>{label}</span>
                  <span className="text-[10px] text-gray-400 leading-tight hidden sm:block">{desc}</span>
                  {active && <span className="text-[9px] bg-primary text-white rounded-full px-2 py-0.5 font-bold">ATIVO</span>}
                </button>
              );
            })}
          </div>
        </div>

        {isAdmin && (<><div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Logo Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              Identidade Visual
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-[300px] h-[300px] border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors overflow-hidden relative mx-auto">
                  {localSettings.logoUrl ? (
                    <img src={localSettings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <Upload className="w-12 h-12 text-gray-400 mb-3" />
                      <p className="mb-2 text-sm text-gray-500 font-semibold">Clique para fazer upload</p>
                      <p className="text-xs text-gray-500">PNG, JPG ou SVG</p>
                    </div>
                  )}
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                </label>
              </div>
              {localSettings.logoUrl && (
                <button 
                  onClick={() => setLocalSettings({ ...localSettings, logoUrl: null })}
                  className="w-full py-2 text-sm text-red-500 font-medium hover:bg-red-50 rounded-lg transition-colors"
                >
                  Remover Logo
                </button>
              )}
            </div>
          </div>

          {cropperOpen && cropperSrc && (
            <Dialog open={cropperOpen} onOpenChange={(open) => { if (!open) { setCropperOpen(false); setCropperSrc(null); } }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Ajustar Logo</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4">
                  <div 
                    className="relative w-[300px] h-[300px] border-2 border-gray-300 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing bg-gray-100 touch-none select-none"
                    onMouseDown={handleCropMouseDown}
                    onMouseMove={handleCropMouseMove}
                    onMouseUp={handleCropMouseUp}
                    onMouseLeave={handleCropMouseUp}
                    onTouchStart={handleCropMouseDown}
                    onTouchMove={handleCropMouseMove}
                    onTouchEnd={handleCropMouseUp}
                  >
                    <canvas ref={cropCanvasRef} className="w-[300px] h-[300px]" style={{ width: 300, height: 300 }} />
                    <div className="absolute inset-0 border-2 border-white/30 rounded-xl pointer-events-none" />
                  </div>
                  <img 
                    ref={cropImgRef} 
                    src={cropperSrc} 
                    className="hidden" 
                    onLoad={() => drawCropPreview()}
                  />
                  <div className="flex items-center gap-3 w-full px-2">
                    <ZoomOut className="w-5 h-5 text-gray-500 shrink-0" />
                    <input 
                      type="range" 
                      min="0.5" 
                      max="3" 
                      step="0.05" 
                      value={cropZoom} 
                      onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <ZoomIn className="w-5 h-5 text-gray-500 shrink-0" />
                  </div>
                  <p className="text-xs text-gray-500 text-center">Arraste para posicionar e use o zoom para ajustar</p>
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => { setCropperOpen(false); setCropperSrc(null); }}
                      className="flex-1 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleCropConfirm}
                      className="flex-1 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Confirmar
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Pricing Parameters */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Parâmetros de Custo e Lucro</h2>
            <div className="space-y-5">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Lucro Desejado (%)
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={localSettings.profitMargin}
                    onChange={(e) => setLocalSettings({ ...localSettings, profitMargin: Number(e.target.value) })}
                  />
                  <span className="absolute right-4 top-2.5 text-gray-400">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Ex: 100 significa dobrar o custo total de fabricação
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Desconto Máximo Permitido (%)
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    step="0.5"
                    className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={localSettings.maxDiscount ?? 10}
                    onChange={(e) => setLocalSettings({ ...localSettings, maxDiscount: Number(e.target.value) })}
                  />
                  <span className="absolute right-4 top-2.5 text-gray-400">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Limite máximo de desconto que pode ser aplicado na calculadora. Use 0 para desativar.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Valor da Mão de Obra (R$/hora)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2.5 text-gray-400">R$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full bg-input border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={localSettings.laborCostPerHour}
                    onChange={(e) => setLocalSettings({ ...localSettings, laborCostPerHour: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Custo de Energia (R$ por kW/h)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2.5 text-gray-400">R$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full bg-input border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={localSettings.kwhCost}
                    onChange={(e) => setLocalSettings({ ...localSettings, kwhCost: Number(e.target.value) })}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Printer Configuration */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 md:col-span-2">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Configuração da Impressora</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Selecione a Impressora 3D
                  </label>
                  <select 
                    className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={localSettings.selectedPrinterId || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, selectedPrinterId: e.target.value })}
                  >
                    <option value="" disabled>Selecione uma impressora do banco...</option>
                    {printers.map(printer => (
                      <option key={printer.id} value={printer.id}>{printer.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Valor de Compra Efetivo (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-gray-400">R$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full bg-input border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      value={localSettings.printerPurchasePrice}
                      onChange={(e) => setLocalSettings({ ...localSettings, printerPurchasePrice: Number(e.target.value) })}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Este valor será usado para cálculo real da depreciação
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Consumo Efetivo (Watts)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-gray-400">W</span>
                    <input 
                      type="number" 
                      className="w-full bg-input border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      value={localSettings.printerPowerWatts}
                      onChange={(e) => setLocalSettings({ ...localSettings, printerPowerWatts: Number(e.target.value) })}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Este valor será usado para cálculo do custo de energia
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Vida Útil Estimada (Horas)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-gray-400">h</span>
                    <input 
                      type="number" 
                      className="w-full bg-input border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      value={localSettings.printerLifespanHours || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, printerLifespanHours: Number(e.target.value) })}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Padrão da indústria é de 6.000 horas
                  </p>
                </div>
              </div>

              {/* Selected Printer Info */}
              {selectedPrinter && (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 h-full">
                  <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Dados de Mercado (Base)</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <span className="text-gray-500">Modelo</span>
                      <span className="font-semibold text-gray-800">{selectedPrinter.name}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <span className="text-gray-500">Valor de Mercado</span>
                      <span className="font-semibold text-gray-800">R$ {selectedPrinter.marketPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <span className="text-gray-500">Consumo Sugerido</span>
                      <span className="font-semibold text-gray-800">{selectedPrinter.hourlyConsumption} kW/h</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <span className="text-gray-500">Consumo Calculado</span>
                      <span className="font-semibold text-gray-800">{(localSettings.printerPowerWatts / 1000).toFixed(2)} kW/h</span>
                    </div>
                    <div className="flex justify-between items-center pb-2">
                      <span className="text-gray-500">Depreciação Calculada</span>
                      <span className="font-semibold text-gray-800">R$ {(localSettings.printerPurchasePrice / (localSettings.printerLifespanHours || 6000)).toFixed(2)}/h</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-xs font-medium border border-blue-100 flex gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                    <span>A depreciação e o consumo acima estão sendo calculados baseados nos valores efetivos preenchidos ao lado.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
        </div>

        {/* Caixa Diário Settings */}
        {isAdmin && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-xl">💰</span> Caixa Diário — Automação
            </h2>
            <div className="space-y-5">
              {/* Auto-open */}
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Abertura Automática</div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Abertura automática</label>
                    <p className="text-xs text-gray-500 mt-0.5">O caixa abre automaticamente no horário configurado</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocalSettings({ ...localSettings, caixaAutoOpenEnabled: !localSettings.caixaAutoOpenEnabled })}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${localSettings.caixaAutoOpenEnabled ? "bg-green-500" : "bg-gray-200"}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${localSettings.caixaAutoOpenEnabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
                {localSettings.caixaAutoOpenEnabled && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Horário de abertura</label>
                    <input
                      type="time"
                      className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all max-w-xs"
                      value={localSettings.caixaAutoOpenTime || "08:00"}
                      onChange={(e) => setLocalSettings({ ...localSettings, caixaAutoOpenTime: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1.5">Abre quando você acessa o sistema após este horário. Não exibe nome de usuário — é identificado como abertura automática.</p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100" />

              {/* Auto-close */}
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Fechamento Automático</div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Fechamento automático</label>
                    <p className="text-xs text-gray-500 mt-0.5">O caixa é fechado automaticamente no horário configurado</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocalSettings({ ...localSettings, caixaAutoCloseEnabled: !localSettings.caixaAutoCloseEnabled })}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${localSettings.caixaAutoCloseEnabled ? "bg-red-500" : "bg-gray-200"}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${localSettings.caixaAutoCloseEnabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
                {localSettings.caixaAutoCloseEnabled && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Horário de fechamento</label>
                    <input
                      type="time"
                      className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all max-w-xs"
                      value={localSettings.caixaAutoCloseTime || "19:00"}
                      onChange={(e) => setLocalSettings({ ...localSettings, caixaAutoCloseTime: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1.5">Se o caixa estiver aberto neste horário, o sistema fecha automaticamente e gera o relatório. Identificado como fechamento automático — sem nome de usuário.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Employees / Funcionários Section */}
        {isAdmin && (<><div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <BadgeDollarSign className="w-5 h-5 text-amber-500" />
                Funcionários e Comissões
              </h2>
              <p className="text-sm text-gray-500 mt-1">Cadastre funcionários com dados completos.</p>
            </div>
            <button
              data-testid="button-open-emp-modal"
              onClick={() => {
                setEmpForm({ name: "", document: "", email: "", whatsapp: "", commissionRate: "", birthdate: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", uf: "" });
                setEmpModalOpen(true);
              }}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors shadow-sm whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              Novo Funcionário
            </button>
          </div>

          <div className="space-y-3">
            {employees.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">
                Nenhum funcionário cadastrado.
              </div>
            )}
            {employees.map(emp => (
              <div key={emp.id} className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                {editingEmpId === emp.id ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      data-testid={`input-edit-emp-name-${emp.id}`}
                      type="text"
                      placeholder="Nome"
                      className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={editEmpName}
                      onChange={(e) => setEditEmpName(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        data-testid={`input-edit-emp-rate-${emp.id}`}
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="%"
                        className="w-24 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={editEmpRate}
                        onChange={(e) => setEditEmpRate(e.target.value)}
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        data-testid={`button-save-emp-${emp.id}`}
                        onClick={() => {
                          if (!editEmpName.trim()) {
                            toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" });
                            return;
                          }
                          updateEmployee({ ...emp, name: editEmpName.trim(), commissionRate: Number(editEmpRate) || 0 });
                          setEditingEmpId(null);
                          toast({ title: "Sucesso", description: "Funcionário atualizado." });
                        }}
                        className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditingEmpId(null)}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-sm flex-shrink-0">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-800 text-sm truncate block">{emp.name}</span>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {(emp as any).linkedUsername && <span>Login: <strong>{(emp as any).linkedUsername}</strong></span>}
                          {(emp as any).linkedUsername && <span>|</span>}
                          <span>Comissão: {emp.commissionRate}%</span>
                          {emp.whatsapp && <span>| {emp.whatsapp}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        data-testid={`button-edit-emp-${emp.id}`}
                        onClick={() => {
                          setEditingEmpId(emp.id);
                          setEditEmpName(emp.name);
                          setEditEmpRate(String(emp.commissionRate));
                        }}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {(emp as any).linkedUsername && (
                        <button
                          data-testid={`button-reset-emp-pw-${emp.id}`}
                          onClick={async () => {
                            if (!window.confirm(`Resetar a senha de "${emp.name}"?`)) return;
                            try {
                              const r = await fetch("/api/auth/reset-password", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ username: (emp as any).linkedUsername }),
                              });
                              const d = await r.json();
                              if (r.ok && d.tempPassword) {
                                setCredentialsModal({ username: (emp as any).linkedUsername, password: d.tempPassword, whatsapp: emp.whatsapp || "", name: emp.name });
                              } else {
                                toast({ title: "Erro", description: d.message || "Erro ao resetar.", variant: "destructive" });
                              }
                            } catch { toast({ title: "Erro", description: "Erro de conexão.", variant: "destructive" }); }
                          }}
                          className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                          title="Resetar senha"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                      )}
                      {(emp as any).linkedUserId && (
                        <button
                          data-testid={`button-permissions-emp-${emp.id}`}
                          onClick={() => openPermissionsModal(emp)}
                          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          title="Gerenciar permissões"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        data-testid={`button-delete-emp-${emp.id}`}
                        onClick={() => {
                          if (window.confirm(`Remover o funcionário "${emp.name}"?`)) {
                            deleteEmployee(emp.id);
                            toast({ title: "Removido", description: `Funcionário "${emp.name}" removido.` });
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Dialog open={empModalOpen} onOpenChange={setEmpModalOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                Cadastrar Funcionário
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome Completo *</label>
                <input data-testid="input-emp-name" type="text" value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Nome completo" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">CPF/CNPJ *</label>
                  <div className="relative">
                    <input
                      data-testid="input-emp-document"
                      type="text"
                      value={empForm.document}
                      onChange={e => { setEmpForm({ ...empForm, document: formatCPF_CNPJ(e.target.value) }); setEmpDocError(""); empCNPJ.reset(); }}
                      onBlur={e => {
                        const val = e.target.value;
                        if (!val) return;
                        const r = validateCPF_CNPJ(val);
                        setEmpDocError(r.valid ? "" : r.message);
                        if (r.valid) {
                          const digits = val.replace(/\D/g, "");
                          if (digits.length === 14) {
                            empCNPJ.lookup(val, (d) => {
                              const filled: string[] = [];
                              setEmpForm(prev => {
                                const next = { ...prev };
                                if (!prev.name && d.name) { next.name = d.tradeName || d.name; filled.push("Nome"); }
                                if (!prev.email && d.email) { next.email = d.email; filled.push("E-mail"); }
                                if (!prev.whatsapp && d.phone) { next.whatsapp = d.phone; filled.push("WhatsApp"); }
                                if (d.cep) { next.cep = d.cep; filled.push("CEP"); }
                                if (d.street) { next.street = d.street; filled.push("Rua"); }
                                if (d.number) { next.number = d.number; filled.push("Número"); }
                                if (d.complement) { next.complement = d.complement; }
                                if (d.neighborhood) { next.neighborhood = d.neighborhood; filled.push("Bairro"); }
                                if (d.city) { next.city = d.city; filled.push("Cidade"); }
                                if (d.uf) { next.uf = d.uf; filled.push("UF"); }
                                return next;
                              });
                              return filled;
                            });
                          }
                        }
                      }}
                      className={`w-full bg-input border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors pr-8 ${empDocError ? "border-red-400 focus:ring-red-200" : "border-border focus:ring-primary/20"}`}
                      placeholder="000.000.000-00"
                      maxLength={18}
                    />
                    {empCNPJ.loading && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                      </span>
                    )}
                  </div>
                  {empCNPJ.loading && <p className="text-xs text-blue-500 mt-1">Consultando CNPJ...</p>}
                  {empDocError && <p className="text-xs text-red-500 mt-1">{empDocError}</p>}
                  {empCNPJ.error && <p className="text-xs text-amber-600 mt-1">{empCNPJ.error}</p>}
                  {empCNPJ.filled.length > 0 && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                      Dados preenchidos automaticamente
                      {empCNPJ.data?.status && <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${empCNPJ.data.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{empCNPJ.data.status}</span>}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">WhatsApp *</label>
                  <input data-testid="input-emp-whatsapp" type="text" value={empForm.whatsapp} onChange={e => setEmpForm({ ...empForm, whatsapp: formatPhone(e.target.value) })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="(00) 00000-0000" maxLength={15} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Data Nasc. *</label>
                  <input data-testid="input-emp-birthdate" type="date" value={empForm.birthdate} onChange={e => setEmpForm({ ...empForm, birthdate: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail</label>
                  <input data-testid="input-emp-email" type="email" value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="email@exemplo.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Comissão (%)</label>
                  <input data-testid="input-emp-commission" type="number" step="0.1" min="0" max="100" value={empForm.commissionRate} onChange={e => setEmpForm({ ...empForm, commissionRate: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">CEP</label>
                  <input data-testid="input-emp-cep" type="text" value={empForm.cep} onChange={e => setEmpForm({ ...empForm, cep: formatCEP(e.target.value) })} onBlur={async (e) => {
                    const cep = e.target.value.replace(/\D/g, '');
                    if (cep.length === 8) {
                      try {
                        const r = await fetch(`/api/cep/${cep}`);
                        const d = await r.json();
                        if (!d.erro) setEmpForm(prev => ({ ...prev, street: d.logradouro, neighborhood: d.bairro, city: d.localidade, uf: d.uf }));
                      } catch {}
                    }
                  }} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="00000-000" maxLength={9} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Rua</label>
                  <input data-testid="input-emp-street" type="text" value={empForm.street} onChange={e => setEmpForm({ ...empForm, street: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Número</label>
                  <input data-testid="input-emp-number" type="text" value={empForm.number} onChange={e => setEmpForm({ ...empForm, number: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Complemento</label>
                  <input data-testid="input-emp-complement" type="text" value={empForm.complement} onChange={e => setEmpForm({ ...empForm, complement: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Bairro</label>
                  <input data-testid="input-emp-neighborhood" type="text" value={empForm.neighborhood} onChange={e => setEmpForm({ ...empForm, neighborhood: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cidade</label>
                  <input data-testid="input-emp-city" type="text" value={empForm.city} onChange={e => setEmpForm({ ...empForm, city: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">UF</label>
                  <input data-testid="input-emp-uf" type="text" value={empForm.uf} onChange={e => setEmpForm({ ...empForm, uf: e.target.value.toUpperCase() })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" maxLength={2} />
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-700">
                <div className="flex items-start gap-1">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <span>Login gerado automaticamente: iniciais do nome/sobrenome + ano de nascimento. A senha será exibida para envio via WhatsApp.</span>
                    {generateLoginPreview(empForm.name, empForm.birthdate) && (
                      <div className="mt-1.5 font-semibold">
                        Login previsto: <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-blue-800">{generateLoginPreview(empForm.name, empForm.birthdate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                data-testid="button-add-employee"
                onClick={async () => {
                  if (!empForm.name.trim()) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
                  if (!empForm.document.trim()) { toast({ title: "Erro", description: "CPF/CNPJ é obrigatório.", variant: "destructive" }); return; }
                  const empDocValidation = validateCPF_CNPJ(empForm.document);
                  if (!empDocValidation.valid) { setEmpDocError(empDocValidation.message); toast({ title: "Erro", description: empDocValidation.message, variant: "destructive" }); return; }
                  if (!empForm.whatsapp.trim()) { toast({ title: "Erro", description: "WhatsApp é obrigatório.", variant: "destructive" }); return; }
                  if (!empForm.birthdate) { toast({ title: "Erro", description: "Data de nascimento é obrigatória.", variant: "destructive" }); return; }
                  const result = await addEmployee({
                    name: empForm.name.trim(),
                    commissionRate: Number(empForm.commissionRate) || 0,
                    whatsapp: empForm.whatsapp,
                    document: empForm.document,
                    email: empForm.email || "",
                    birthdate: empForm.birthdate,
                    cep: empForm.cep,
                    street: empForm.street,
                    number: empForm.number,
                    complement: empForm.complement,
                    neighborhood: empForm.neighborhood,
                    city: empForm.city,
                    uf: empForm.uf,
                  });
                  if (result && result.generatedUsername) {
                    setEmpModalOpen(false);
                    setCredentialsModal({
                      username: result.generatedUsername,
                      password: result.generatedPassword,
                      whatsapp: empForm.whatsapp,
                      name: empForm.name.trim(),
                      type: 'employee',
                    });
                    toast({ title: "Sucesso", description: "Funcionário cadastrado com sucesso!" });
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-semibold transition-colors shadow-sm"
              >
                <UserPlus className="w-5 h-5" />
                Cadastrar Funcionário
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de permissões do funcionário */}
        <Dialog open={!!permissionsModal} onOpenChange={(open) => { if (!open) setPermissionsModal(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Permissões — {permissionsModal?.empName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 mt-2">
              <p className="text-xs text-muted-foreground mb-3">Selecione os módulos que este funcionário pode acessar:</p>
              {PERMISSION_MODULES.map(mod => {
                const checked = permissionsModal?.perms.includes(mod.key) ?? false;
                return (
                  <label
                    key={mod.key}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/40 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (!permissionsModal) return;
                        const next = checked
                          ? permissionsModal.perms.filter(p => p !== mod.key)
                          : [...permissionsModal.perms, mod.key];
                        setPermissionsModal({ ...permissionsModal, perms: next });
                      }}
                      className="w-4 h-4 accent-primary"
                      data-testid={`checkbox-perm-${mod.key}`}
                    />
                    <span className="text-sm">{mod.label}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setPermissionsModal(null)}
                className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-secondary/40 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={savePermissions}
                disabled={permsSaving}
                data-testid="button-save-permissions"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {permsSaving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!credentialsModal} onOpenChange={() => setCredentialsModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-green-700">
                {credentialsModal?.type === 'user' ? 'Usuário Cadastrado!' : 'Funcionário Cadastrado!'}
              </DialogTitle>
            </DialogHeader>
            {credentialsModal && (
              <div className="space-y-4 mt-2">
                <p className="text-sm text-gray-600">Credenciais geradas para <strong>{credentialsModal.name}</strong>:</p>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Usuário:</span>
                    <span className="font-mono font-bold text-gray-800">{credentialsModal.username}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Senha temporária:</span>
                    <span className="font-mono font-bold text-lg tracking-widest text-green-700">{credentialsModal.password}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {credentialsModal?.type === 'user'
                    ? 'O usuário será obrigado a criar uma nova senha no primeiro acesso.'
                    : 'O funcionário será obrigado a criar uma nova senha no primeiro acesso.'}
                </p>
                <button
                  data-testid="button-send-whatsapp-credentials"
                  onClick={() => {
                    const phone = credentialsModal.whatsapp.replace(/\D/g, '');
                    const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
                    const msg = encodeURIComponent(
                      `Olá ${credentialsModal.name}! 👋\n\nSuas credenciais de acesso ao C3D Manager®:\n\n🔑 Usuário: ${credentialsModal.username}\n🔒 Senha temporária: ${credentialsModal.password}\n\n⚠️ No primeiro acesso, o sistema vai pedir para você criar uma nova senha.\n\nAcesse o sistema pelo link que o administrador vai compartilhar.`
                    );
                    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition-colors shadow-sm"
                >
                  <Phone className="w-5 h-5" />
                  Enviar pelo WhatsApp
                </button>
                <button
                  onClick={() => setCredentialsModal(null)}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
                >
                  Fechar
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog></>)}

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
            WhatsApp do Administrador
          </h2>
          <p className="text-sm text-gray-500 mb-4">Número para funcionários entrarem em contato ao esquecer a senha. Formato: código do país + DDD + número (ex: 5521999999999).</p>
          <input
            data-testid="input-admin-whatsapp"
            type="text"
            placeholder="Ex: 5521999999999"
            value={localSettings.adminWhatsapp || ""}
            onChange={(e) => setLocalSettings({ ...localSettings, adminWhatsapp: e.target.value || null })}
            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Backup Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
            Backup do Sistema
          </h2>
          <p className="text-sm text-gray-500 mb-6">Exporte ou importe todos os dados do sistema (clientes, estoque, orçamentos, etc) em formato Excel (.xlsx).</p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleExportBackup}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-semibold transition-colors shadow-sm"
            >
              <Download className="w-5 h-5" />
              Exportar Backup (Excel)
            </button>
            
            <button
              onClick={() => backupInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold transition-colors shadow-sm"
            >
              <UploadCloud className="w-5 h-5" />
              Importar Backup (Excel)
            </button>
            <input 
              ref={backupInputRef}
              type="file" 
              accept=".xlsx, .xls"
              className="hidden"
              onChange={handleImportBackup}
            />
          </div>
        </div>
        </>)}

        {!isAdmin && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Selecionar Impressora</h2>
            <p className="text-sm text-gray-500 mb-4">Escolha a impressora que você utiliza para os cálculos.</p>
            <select 
              className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              value={localSettings.selectedPrinterId || ''}
              onChange={(e) => {
                const updated = { ...localSettings, selectedPrinterId: e.target.value };
                setLocalSettings(updated);
                updateSettings(updated);
                toast({ title: "Sucesso", description: "Impressora selecionada com sucesso." });
              }}
            >
              <option value="" disabled>Selecione uma impressora...</option>
              {printers.map(printer => (
                <option key={printer.id} value={printer.id}>{printer.name}</option>
              ))}
            </select>
            {selectedPrinter && (
              <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Impressora Selecionada</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Modelo</span>
                    <span className="font-semibold text-gray-800">{selectedPrinter.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valor de Mercado</span>
                    <span className="font-semibold text-gray-800">R$ {selectedPrinter.marketPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Consumo</span>
                    <span className="font-semibold text-gray-800">{selectedPrinter.hourlyConsumption} kW/h</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {isMasterAdmin ? (<>
        {/* ── CONTROLE DE ACESSO ── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Controle de Acesso — Contas/Empresas
            </h2>
            <p className="text-sm text-gray-500 mt-1">Gerencie o status de acesso de cada conta. Estrutura preparada para controle por empresa.</p>
          </div>

          {/* Banner de contas sem email */}
          {usersList.filter(u => !u.email).length > 0 && (
            <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              <div>
                <p className="text-xs font-semibold text-amber-800">
                  {usersList.filter(u => !u.email).length === 1
                    ? "1 conta sem email cadastrado"
                    : `${usersList.filter(u => !u.email).length} contas sem email cadastrado`}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">A recuperação de senha por email estará indisponível para essas contas. Use o botão <strong>Cadastrar email</strong> em cada conta para habilitar.</p>
              </div>
            </div>
          )}

          {usersList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma conta cadastrada.</p>
          ) : (
            <div className="space-y-3">
              {usersList.map(u => {
                const status = u.accessStatus || "full";
                const isEditingThis = accessStatusEditing === u.id;
                let daysRemaining: number | null = null;
                if (u.trialEndsAt) {
                  const diff = Math.ceil((new Date(u.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  daysRemaining = diff;
                }
                const trialExpired = status === "trial" && daysRemaining !== null && daysRemaining <= 0;
                return (
                  <div key={u.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800 text-sm font-mono">{u.username}</span>
                          {/* Status badge */}
                          {status === "trial" && !trialExpired && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                              <FlaskConical className="w-3 h-3" /> Trial
                            </span>
                          )}
                          {status === "trial" && trialExpired && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                              <Clock className="w-3 h-3" /> Trial expirado
                            </span>
                          )}
                          {status === "full" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                              <InfinityIcon className="w-3 h-3" /> Full
                            </span>
                          )}
                          {status === "blocked" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                              <Ban className="w-3 h-3" /> Bloqueado
                            </span>
                          )}
                          {u.mustChangePassword && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                              🔑 1º acesso pendente
                            </span>
                          )}
                        </div>
                        {/* Email row */}
                        <div className="mt-1 flex items-center gap-1.5 text-xs">
                          {u.email ? (
                            <span className="text-gray-500 flex items-center gap-1">
                              <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                              <span className="font-mono text-gray-600">{u.email}</span>
                            </span>
                          ) : (
                            <span className="text-amber-600 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                              Sem email — recuperação de senha indisponível
                            </span>
                          )}
                        </div>
                        {/* Trial info row */}
                        {status === "trial" && u.trialEndsAt && (
                          <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5" />
                              Vence em: <strong className="text-gray-700">{new Date(u.trialEndsAt).toLocaleDateString("pt-BR")}</strong>
                            </span>
                            <span className={`font-semibold ${trialExpired ? "text-red-600" : (daysRemaining ?? 8) <= 1 ? "text-red-500" : (daysRemaining ?? 8) <= 3 ? "text-amber-600" : "text-blue-600"}`}>
                              {trialExpired ? "Expirado" : daysRemaining === 1 ? "1 dia restante" : `${daysRemaining} dias restantes`}
                            </span>
                          </div>
                        )}
                        {status === "full" && (
                          <p className="mt-1 text-xs text-gray-400">Acesso completo sem limitação</p>
                        )}
                        {status === "blocked" && (
                          <p className="mt-1 text-xs text-gray-400">Acesso bloqueado — login funciona mas funcionalidades bloqueadas</p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Email button */}
                        <button
                          data-testid={`button-edit-email-${u.id}`}
                          onClick={() => {
                            if (emailEditingId === u.id) {
                              setEmailEditingId(null);
                            } else {
                              setEmailEditingId(u.id);
                              if (!(u.id in emailEditValues)) {
                                setEmailEditValues(prev => ({ ...prev, [u.id]: u.email || "" }));
                              }
                            }
                          }}
                          className={`flex items-center gap-1.5 text-xs font-semibold border px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                            u.email
                              ? "text-gray-500 hover:text-gray-700 border-gray-200 bg-gray-50 hover:bg-gray-100"
                              : "text-amber-700 hover:text-amber-900 border-amber-300 bg-amber-50 hover:bg-amber-100"
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          {u.email ? "Editar email" : "Cadastrar email"}
                        </button>

                        {/* Status button */}
                        <button
                          data-testid={`button-access-status-${u.id}`}
                          onClick={() => {
                            if (isEditingThis) {
                              setAccessStatusEditing(null);
                              setTrialEndDateEdit("");
                            } else {
                              setAccessStatusEditing(u.id);
                              if (u.trialEndsAt) {
                                setTrialEndDateEdit(new Date(u.trialEndsAt).toISOString().slice(0, 10));
                              } else {
                                const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                                setTrialEndDateEdit(d.toISOString().slice(0, 10));
                              }
                            }
                          }}
                          className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-semibold border border-purple-200 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isEditingThis ? "rotate-180" : ""}`} />
                          Alterar status
                        </button>
                      </div>
                    </div>

                    {/* Inline email editor */}
                    {emailEditingId === u.id && (
                      <div className="mt-3 pt-3 border-t border-amber-100 bg-amber-50/50 rounded-lg px-3 py-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          {u.email ? "Editar email de recuperação:" : "Cadastrar email de recuperação:"}
                        </p>
                        <div className="flex gap-2 items-center">
                          <input
                            data-testid={`input-email-${u.id}`}
                            type="email"
                            value={emailEditValues[u.id] ?? (u.email || "")}
                            onChange={e => setEmailEditValues(prev => ({ ...prev, [u.id]: e.target.value }))}
                            placeholder="email@empresa.com"
                            autoFocus
                            className="flex-1 border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                          />
                          <button
                            data-testid={`button-save-email-${u.id}`}
                            onClick={async () => {
                              await handleSaveEmail(u.id);
                              setEmailEditingId(null);
                            }}
                            disabled={emailSavingId === u.id}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            <Check className="w-4 h-4" />
                            {emailSavingId === u.id ? "Salvando..." : "Salvar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmailEditingId(null)}
                            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">Usado exclusivamente para recuperação de senha. Deixe vazio para remover.</p>
                      </div>
                    )}

                    {/* Inline status editor */}
                    {isEditingThis && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 mb-3">Novo status de acesso:</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {(["trial", "full", "blocked"] as const).map(s => {
                            const labels = { trial: "Trial", full: "Full", blocked: "Bloqueado" };
                            const colors = {
                              trial: "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100",
                              full: "border-green-300 bg-green-50 text-green-700 hover:bg-green-100",
                              blocked: "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100",
                            };
                            const icons = {
                              trial: <FlaskConical className="w-3.5 h-3.5" />,
                              full: <InfinityIcon className="w-3.5 h-3.5" />,
                              blocked: <Ban className="w-3.5 h-3.5" />,
                            };
                            return (
                              <button
                                key={s}
                                data-testid={`button-set-status-${s}-${u.id}`}
                                onClick={() => {
                                  if (s !== "trial") {
                                    handleUpdateAccessStatus(u.id, s);
                                  } else {
                                    handleUpdateAccessStatus(u.id, s, trialEndDateEdit ? new Date(trialEndDateEdit + "T12:00:00").toISOString() : undefined);
                                  }
                                }}
                                disabled={accessStatusSaving || s === status}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-50 ${s === status ? "ring-2 ring-offset-1 ring-purple-400" : ""} ${colors[s]}`}
                              >
                                {icons[s]} {labels[s]}
                                {s === status && <Check className="w-3 h-3" />}
                              </button>
                            );
                          })}
                        </div>
                        {/* Trial end date picker — only shown when trial is selected */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                            <span className="font-medium">Data de vencimento do trial:</span>
                          </div>
                          <input
                            data-testid={`input-trial-end-date-${u.id}`}
                            type="date"
                            value={trialEndDateEdit}
                            onChange={e => setTrialEndDateEdit(e.target.value)}
                            className="border border-gray-200 bg-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                          />
                          {trialEndDateEdit && (
                            <button
                              onClick={() => handleUpdateAccessStatus(u.id, "trial", new Date(trialEndDateEdit + "T12:00:00").toISOString())}
                              disabled={accessStatusSaving}
                              className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-semibold transition-colors disabled:opacity-50"
                            >
                              <Check className="w-3 h-3" />
                              Salvar data
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          A data de vencimento é usada mesmo quando o status é alterado para outro valor e depois volta para Trial.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── GERENCIAMENTO DE USUÁRIOS ── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Key className="w-5 h-5 text-green-600" />
                Gerenciamento de Usuários
              </h2>
              <p className="text-sm text-gray-500 mt-1">Cadastre novos usuários ou altere senhas de acesso ao sistema.</p>
            </div>
            <button
              data-testid="button-open-user-modal"
              onClick={() => {
                setUserForm({ name: "", document: "", email: "", whatsapp: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", uf: "", birthdate: "", password: "", passwordHint: "" });
                setUserModalOpen(true);
              }}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors shadow-sm whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              Novo Usuário
            </button>
          </div>

          <div className="space-y-4">
            {usersList.map(u => (
              <div key={u.id} className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-gray-800 text-sm truncate">{u.username}</span>
                    {u.id === currentUserId && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium whitespace-nowrap">Você</span>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      data-testid={`button-change-password-${u.id}`}
                      onClick={() => setChangingPasswordId(changingPasswordId === u.id ? null : u.id)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors px-2 py-1.5"
                      title="Alterar senha"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Senha</span>
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        data-testid={`button-delete-user-${u.id}`}
                        onClick={() => handleDeleteUser(u.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Excluir usuário"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {changingPasswordId === u.id && (
                  <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-200">
                    {u.id === currentUserId && (
                      <input
                        data-testid="input-current-password"
                        type="password"
                        placeholder="Senha atual"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    )}
                    <input
                      data-testid="input-new-password"
                      type="password"
                      placeholder="Nova senha (mín. 6 caracteres)"
                      value={changedPassword}
                      onChange={e => setChangedPassword(e.target.value)}
                      className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <div className="flex gap-2">
                      <button
                        data-testid={`button-save-password-${u.id}`}
                        onClick={() => handleChangePassword(u.id)}
                        className="flex-1 bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => { setChangingPasswordId(null); setCurrentPassword(""); setChangedPassword(""); }}
                        className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm border border-gray-200 rounded-lg"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

        <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-green-600" />
                Cadastrar Novo Usuário
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome Completo *</label>
                <input data-testid="input-new-username" type="text" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Nome completo" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">CPF/CNPJ *</label>
                  <div className="relative">
                    <input
                      data-testid="input-new-user-cpf"
                      type="text"
                      value={userForm.document}
                      onChange={e => { setUserForm({ ...userForm, document: formatCPF_CNPJ(e.target.value) }); setUserDocError(""); userCNPJ.reset(); }}
                      onBlur={e => {
                        const val = e.target.value;
                        if (!val) return;
                        const r = validateCPF_CNPJ(val);
                        setUserDocError(r.valid ? "" : r.message);
                        if (r.valid) {
                          const digits = val.replace(/\D/g, "");
                          if (digits.length === 14) {
                            userCNPJ.lookup(val, (d) => {
                              const filled: string[] = [];
                              setUserForm(prev => {
                                const next = { ...prev };
                                if (!prev.name && d.name) { next.name = d.tradeName || d.name; filled.push("Nome"); }
                                if (!prev.email && d.email) { next.email = d.email; filled.push("E-mail"); }
                                if (!prev.whatsapp && d.phone) { next.whatsapp = d.phone; filled.push("WhatsApp"); }
                                if (d.cep) { next.cep = d.cep; filled.push("CEP"); }
                                if (d.street) { next.street = d.street; filled.push("Rua"); }
                                if (d.number) { next.number = d.number; filled.push("Número"); }
                                if (d.complement) { next.complement = d.complement; }
                                if (d.neighborhood) { next.neighborhood = d.neighborhood; filled.push("Bairro"); }
                                if (d.city) { next.city = d.city; filled.push("Cidade"); }
                                if (d.uf) { next.uf = d.uf; filled.push("UF"); }
                                return next;
                              });
                              return filled;
                            });
                          }
                        }
                      }}
                      className={`w-full bg-input border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors pr-8 ${userDocError ? "border-red-400 focus:ring-red-200" : "border-border focus:ring-primary/20"}`}
                      placeholder="000.000.000-00"
                      maxLength={18}
                    />
                    {userCNPJ.loading && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                      </span>
                    )}
                  </div>
                  {userCNPJ.loading && <p className="text-xs text-blue-500 mt-1">Consultando CNPJ...</p>}
                  {userDocError && <p className="text-xs text-red-500 mt-1">{userDocError}</p>}
                  {userCNPJ.error && <p className="text-xs text-amber-600 mt-1">{userCNPJ.error}</p>}
                  {userCNPJ.filled.length > 0 && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                      Dados preenchidos automaticamente
                      {userCNPJ.data?.status && <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${userCNPJ.data.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{userCNPJ.data.status}</span>}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Data de Nascimento *</label>
                  <input data-testid="input-new-user-birthdate" type="date" value={userForm.birthdate} onChange={e => setUserForm({ ...userForm, birthdate: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">WhatsApp</label>
                  <input data-testid="input-new-user-whatsapp" type="text" value={userForm.whatsapp} onChange={e => setUserForm({ ...userForm, whatsapp: formatPhone(e.target.value) })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="(00) 00000-0000" maxLength={15} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail</label>
                  <input data-testid="input-new-user-email" type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="email@exemplo.com" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">CEP</label>
                  <input data-testid="input-new-user-cep" type="text" value={userForm.cep} onChange={e => setUserForm({ ...userForm, cep: formatCEP(e.target.value) })} onBlur={async (e) => {
                    const cep = e.target.value.replace(/\D/g, '');
                    if (cep.length === 8) {
                      try {
                        const r = await fetch(`/api/cep/${cep}`);
                        const d = await r.json();
                        if (!d.erro) setUserForm(prev => ({ ...prev, street: d.logradouro, neighborhood: d.bairro, city: d.localidade, uf: d.uf }));
                      } catch {}
                    }
                  }} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="00000-000" maxLength={9} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Rua</label>
                  <input data-testid="input-new-user-street" type="text" value={userForm.street} onChange={e => setUserForm({ ...userForm, street: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Número</label>
                  <input data-testid="input-new-user-number" type="text" value={userForm.number} onChange={e => setUserForm({ ...userForm, number: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Complemento</label>
                  <input data-testid="input-new-user-complement" type="text" value={userForm.complement} onChange={e => setUserForm({ ...userForm, complement: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Bairro</label>
                  <input data-testid="input-new-user-neighborhood" type="text" value={userForm.neighborhood} onChange={e => setUserForm({ ...userForm, neighborhood: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cidade</label>
                  <input data-testid="input-new-user-city" type="text" value={userForm.city} onChange={e => setUserForm({ ...userForm, city: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">UF</label>
                  <input data-testid="input-new-user-uf" type="text" value={userForm.uf} onChange={e => setUserForm({ ...userForm, uf: e.target.value.toUpperCase() })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" maxLength={2} />
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-700">
                <div className="flex items-start gap-1">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <span>Login gerado automaticamente: iniciais do nome/sobrenome + ano de nascimento. As credenciais serão exibidas após o cadastro.</span>
                    {generateLoginPreview(userForm.name, userForm.birthdate) && (
                      <div className="mt-1.5 font-semibold">
                        Login previsto: <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-blue-800">{generateLoginPreview(userForm.name, userForm.birthdate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-xs text-amber-700">
                <div className="flex items-start gap-1">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Uma senha temporária será gerada automaticamente e exibida após o cadastro. O usuário deverá criar uma senha definitiva no primeiro acesso.</span>
                </div>
              </div>
              <button
                data-testid="button-add-user"
                onClick={handleAddUser}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition-colors shadow-sm"
              >
                <UserPlus className="w-5 h-5" />
                Cadastrar Usuário
              </button>
            </div>
          </DialogContent>
        </Dialog>
        </>) : (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
            Alterar Minha Senha
          </h2>
          <p className="text-sm text-gray-500 mb-4">Altere sua senha de acesso ao sistema.</p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                data-testid="input-self-current-password"
                type="password"
                placeholder="Senha atual"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="flex-1 bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <input
                data-testid="input-self-new-password"
                type="password"
                placeholder="Nova senha (mín. 6 caracteres)"
                value={changedPassword}
                onChange={e => setChangedPassword(e.target.value)}
                className="flex-1 bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <input
              data-testid="input-self-password-hint"
              type="text"
              placeholder="Dica de senha (opcional)"
              value={changePasswordHint}
              onChange={e => setChangePasswordHint(e.target.value)}
              className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button
              data-testid="button-self-change-password"
              onClick={() => { if (currentUserId) handleChangePassword(currentUserId); }}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors shadow-sm"
            >
              <Key className="w-5 h-5" />
              Alterar
            </button>
          </div>
        </div>
        )}

        {/* ── AVANÇADO (somente super_admin) ── */}
        {isMasterAdmin && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-100 mt-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-amber-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Avançado — Reset do Sistema
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Esta ação não pode ser desfeita. Os dados operacionais serão reiniciados.
              </p>
            </div>

            <div className="space-y-4">
              {/* Reset por empresa */}
              <div className="p-4">
                <h3 className="text-sm font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4" /> Resetar Empresa
                </h3>
                <p className="text-xs text-amber-600 mb-3">
                  Apaga todos os dados operacionais de uma empresa específica (clientes, orçamentos, estoque, financeiro, funcionários). A conta permanece ativa.
                </p>
                <div className="flex gap-2 items-center">
                  <select
                    data-testid="select-reset-company"
                    value={resetTargetUserId}
                    onChange={e => setResetTargetUserId(e.target.value)}
                    className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  >
                    <option value="">Selecione a empresa...</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                  <button
                    data-testid="button-open-reset-company"
                    disabled={!resetTargetUserId}
                    onClick={() => openResetModal('company')}
                    className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Resetar
                  </button>
                </div>
              </div>

              {/* Reset global */}
              <div className="p-4">
                <h3 className="text-sm font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Resetar Sistema Completo
                </h3>
                <p className="text-xs text-amber-600 mb-3">
                  Apaga os dados operacionais de <strong>todas as empresas</strong> cadastradas na plataforma. As contas permanecem ativas.
                </p>
                <button
                  data-testid="button-open-reset-system"
                  onClick={() => openResetModal('system')}
                  className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" /> Resetar Todas as Empresas
                </button>
              </div>

              {/* Reset seletivo */}
              <div className="p-4 border-t border-amber-100">
                <h3 className="text-sm font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> Reset Seletivo por Módulo
                </h3>
                <p className="text-xs text-amber-600 mb-3">
                  Escolha exatamente quais dados deseja zerar. Super admin nunca é afetado.
                </p>
                <button
                  data-testid="button-open-selective-reset"
                  onClick={() => setSelectiveOpen(true)}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Shield className="w-4 h-4" /> Configurar Reset Seletivo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL DE CONFIRMAÇÃO DE RESET ── */}
        {resetModalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-red-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-red-100 rounded-full p-2 flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-red-800">
                    {resetModalType === 'system' ? 'Confirmar Reset do Sistema' : 'Confirmar Reset da Empresa'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {resetModalType === 'system'
                      ? 'Esta ação apagará os dados operacionais de todas as empresas. Irreversível.'
                      : 'Esta ação apagará todos os dados operacionais da empresa abaixo. Irreversível.'}
                  </p>
                  {resetModalType === 'company' && resetLockedCompany && (
                    <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <span className="text-xs text-amber-700 font-semibold">Empresa selecionada: </span>
                      <span className="text-xs text-amber-900 font-bold">{resetLockedCompany.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {/* Senha */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Sua senha (super admin)</label>
                  <div className="relative">
                    <input
                      data-testid="input-reset-password"
                      type={resetShowPassword ? "text" : "password"}
                      value={resetPassword}
                      onChange={e => setResetPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                    <button
                      type="button"
                      onClick={() => setResetShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {resetShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Texto de confirmação */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Digite <span className="font-mono bg-red-100 text-red-700 px-1 rounded">
                      {resetModalType === 'system' ? 'RESETAR SISTEMA' : 'RESETAR EMPRESA'}
                    </span> para confirmar
                  </label>
                  <input
                    data-testid="input-reset-confirm-text"
                    type="text"
                    value={resetConfirmText}
                    onChange={e => setResetConfirmText(e.target.value)}
                    placeholder={resetModalType === 'system' ? 'RESETAR SISTEMA' : 'RESETAR EMPRESA'}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </div>

                {resetError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{resetError}</p>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  data-testid="button-reset-cancel"
                  onClick={closeResetModal}
                  disabled={resetLoading}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  data-testid="button-reset-confirm"
                  onClick={handleReset}
                  disabled={resetLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  {resetLoading ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  ) : <AlertTriangle className="w-4 h-4" />}
                  {resetLoading ? 'Executando...' : 'Confirmar Reset'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL DE RESET SELETIVO ── */}
        {selectiveOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-base font-bold text-amber-800 flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5" /> Reset Seletivo por Módulo
              </h2>
              <p className="text-xs text-amber-600 mb-4">
                Selecione os módulos que deseja zerar em <strong>todas as empresas</strong>. O super admin nunca é afetado.
              </p>

              {/* Toggle todos */}
              <label className="flex items-center gap-2 mb-3 cursor-pointer select-none p-2 rounded-lg bg-amber-50 border border-amber-200">
                <input
                  type="checkbox"
                  data-testid="checkbox-selective-all"
                  checked={selectiveAll}
                  onChange={toggleSelectiveAll}
                  className="w-4 h-4 accent-amber-600"
                />
                <span className="text-sm font-bold text-amber-800">Selecionar tudo</span>
              </label>

              {/* Módulos */}
              <div className="space-y-1.5 mb-4">
                {SELECTIVE_MODULES.map(m => (
                  <label key={m.id} className="flex items-start gap-2 cursor-pointer select-none p-2 rounded-lg hover:bg-gray-50 border border-gray-100">
                    <input
                      type="checkbox"
                      data-testid={`checkbox-selective-${m.id}`}
                      checked={selectiveModules.has(m.id)}
                      onChange={() => toggleSelectiveModule(m.id)}
                      className="mt-0.5 w-4 h-4 accent-amber-600"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{m.label}</p>
                      <p className="text-xs text-gray-400">{m.tables}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Senha */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Sua senha de super admin</label>
                <div className="relative">
                  <input
                    data-testid="input-selective-password"
                    type={selectiveShowPassword ? "text" : "password"}
                    value={selectivePassword}
                    onChange={e => setSelectivePassword(e.target.value)}
                    placeholder="Senha"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectiveShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {selectiveShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmação por texto */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Digite <span className="font-mono font-bold text-amber-700">RESETAR SISTEMA</span> para confirmar
                </label>
                <input
                  data-testid="input-selective-confirm-text"
                  type="text"
                  value={selectiveConfirmText}
                  onChange={e => setSelectiveConfirmText(e.target.value)}
                  placeholder="RESETAR SISTEMA"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              {selectiveError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{selectiveError}</p>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  data-testid="button-selective-cancel"
                  onClick={closeSelectiveModal}
                  disabled={selectiveLoading}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  data-testid="button-selective-confirm"
                  onClick={handleSelectiveReset}
                  disabled={selectiveLoading || (selectiveModules.size === 0 && !selectiveAll)}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  {selectiveLoading ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  ) : <Shield className="w-4 h-4" />}
                  {selectiveLoading ? 'Executando...' : 'Executar Reset Seletivo'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}