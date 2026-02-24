import { useState, useRef, useEffect, useCallback } from "react";
import { useAppState } from "../context/AppState";
import { useAuth } from "../context/AuthContext";
import { Save, Upload, Info, Download, UploadCloud, UserPlus, Trash2, Key, Edit2, BadgeDollarSign, Phone, X, ZoomIn, ZoomOut, Check } from "lucide-react";
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

export default function Settings() {
  const { settings, updateSettings, printers, clients, inventory, stockItems, history, employees, addEmployee, updateEmployee, deleteEmployee, loadBackup } = useAppState();
  const { isMasterAdmin } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const [localSettings, setLocalSettings] = useState(settings);

  const [usersList, setUsersList] = useState<{ id: string; username: string }[]>([]);
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
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [empForm, setEmpForm] = useState({ name: "", document: "", email: "", whatsapp: "", commissionRate: "", birthdate: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", uf: "" });
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", document: "", email: "", whatsapp: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", uf: "", birthdate: "", password: "", passwordHint: "" });
  const [credentialsModal, setCredentialsModal] = useState<{ username: string; password: string; whatsapp: string; name: string } | null>(null);
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
    if (!userForm.birthdate) {
      toast({ title: "Erro", description: "Data de nascimento é obrigatória.", variant: "destructive" });
      return;
    }
    if (!userForm.password || userForm.password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    const body: any = {
      username: userForm.name.trim(),
      password: userForm.password,
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
    if (userForm.passwordHint.trim()) body.passwordHint = userForm.passwordHint.trim();
    const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Erro", description: data.message, variant: "destructive" });
      return;
    }
    setUsersList([...usersList, { id: data.id, username: data.username }]);
    setUserModalOpen(false);
    setCredentialsModal({ username: data.username, password: userForm.password, whatsapp: userForm.whatsapp || "", name: userForm.name.trim() });
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

  const saveSettings = () => {
    updateSettings(localSettings);
    toast({
      title: "Sucesso",
      description: "Ajustes salvos com sucesso.",
    });
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

      XLSX.writeFile(wb, `Corb3D_Backup_${format(new Date(), 'dd-MM-yyyy_HHmm')}.xlsx`);
      
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
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl shadow-black/[0.03]">
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
                  <input data-testid="input-emp-document" type="text" value={empForm.document} onChange={e => setEmpForm({ ...empForm, document: formatCPF_CNPJ(e.target.value) })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="000.000.000-00" maxLength={18} />
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
                <Info className="w-4 h-4 inline mr-1" />
                O login será gerado automaticamente: iniciais do nome/sobrenome + ano de nascimento (ex: hc1990). A senha será gerada e exibida para envio via WhatsApp.
              </div>
              <button
                data-testid="button-add-employee"
                onClick={async () => {
                  if (!empForm.name.trim()) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
                  if (!empForm.document.trim()) { toast({ title: "Erro", description: "CPF/CNPJ é obrigatório.", variant: "destructive" }); return; }
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

        <Dialog open={!!credentialsModal} onOpenChange={() => setCredentialsModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-green-700">Funcionário Cadastrado!</DialogTitle>
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
                <p className="text-xs text-gray-500">O funcionário será obrigado a criar uma nova senha no primeiro acesso.</p>
                <button
                  data-testid="button-send-whatsapp-credentials"
                  onClick={() => {
                    const phone = credentialsModal.whatsapp.replace(/\D/g, '');
                    const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
                    const msg = encodeURIComponent(
                      `Olá ${credentialsModal.name}! 👋\n\nSuas credenciais de acesso ao Corb3D Manager:\n\n🔑 Usuário: ${credentialsModal.username}\n🔒 Senha temporária: ${credentialsModal.password}\n\n⚠️ No primeiro acesso, o sistema vai pedir para você criar uma nova senha.\n\nAcesse o sistema pelo link que o administrador vai compartilhar.`
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
                  <input data-testid="input-new-user-cpf" type="text" value={userForm.document} onChange={e => setUserForm({ ...userForm, document: formatCPF_CNPJ(e.target.value) })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="000.000.000-00" maxLength={18} />
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
                <Info className="w-4 h-4 inline mr-1" />
                O login será gerado automaticamente: iniciais do nome/sobrenome + ano de nascimento (ex: hc1990). As credenciais serão exibidas após o cadastro.
              </div>
              <div className="border-t border-border/50 pt-4">
                <h4 className="text-sm font-semibold mb-3 text-gray-700">Credenciais de Acesso</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Senha *</label>
                    <input data-testid="input-new-user-password" type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Mín. 6 caracteres" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Dica de Senha</label>
                    <input data-testid="input-new-user-hint" type="text" value={userForm.passwordHint} onChange={e => setUserForm({ ...userForm, passwordHint: e.target.value })} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Opcional" />
                  </div>
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

      </div>
    </div>
  );
}