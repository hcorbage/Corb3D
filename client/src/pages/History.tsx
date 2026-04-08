import { useState } from "react";
import { useLocation } from "wouter";
import { useAppState, Calculation } from "../context/AppState";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Edit2, Trash2, Clock, XCircle, Check, Search, Eye, MoreHorizontal, Activity, BookOpen } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "credito", label: "Cartão de Crédito" },
  { value: "debito", label: "Cartão de Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "entrada_50", label: "50% Entrada + 50% na Entrega" },
  { value: "a_faturar", label: "A Faturar (cobrar depois)" },
];

export default function History() {
  const { history, updateCalculation, deleteCalculation, clients } = useAppState();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [editingCalc, setEditingCalc] = useState<Calculation | null>(null);
  const [viewingCalc, setViewingCalc] = useState<Calculation | null>(null);
  const [editFormData, setEditFormData] = useState({
    clientName: '',
    projectName: '',
    totalCost: 0,
    suggestedPrice: 0
  });
  
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");

  const [paymentModal, setPaymentModal] = useState<{ calc: Calculation } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleStatusChange = (calc: Calculation, newStatus: 'pending' | 'confirmed' | 'denied') => {
    if (newStatus === 'confirmed') {
      setPaymentModal({ calc });
      setPaymentMethod("pix");
      const price = calc.suggestedPrice || calc.totalCost || 0;
      setPaymentAmount(price.toFixed(2));
      // Default due date = 7 days from today
      const d = new Date(); d.setDate(d.getDate() + 7);
      setDueDate(d.toISOString().slice(0, 10));
      return;
    }
    updateCalculation({ ...calc, status: newStatus });
    let statusText = "Aguardando";
    if (newStatus === 'denied') statusText = "Não Autorizado";
    toast({ title: "Status Atualizado", description: `Orçamento marcado como ${statusText}.` });
  };

  const handleConfirmPayment = async () => {
    if (!paymentModal) return;
    const { calc } = paymentModal;
    const totalPrice = calc.suggestedPrice || calc.totalCost || 0;
    const isEntrada50 = paymentMethod === "entrada_50";
    const isAFaturar = paymentMethod === "a_faturar";
    const paidAmount = isEntrada50 ? totalPrice * 0.5 : (isAFaturar ? 0 : (Number(paymentAmount) || totalPrice));
    if (isAFaturar && !dueDate) {
      toast({ title: "Informe a data de faturamento.", variant: "destructive" }); return;
    }
    updateCalculation({ ...calc, status: 'confirmed' });
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
      // Create order financial record (idempotent)
      const ofRes = await fetch("/api/order-financials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calculationId: calc.id,
          clientName: calc.clientName || "",
          projectName: calc.projectName || "",
          totalAmount: totalPrice,
          paymentMethod,
          dueDate: isAFaturar ? dueDate : null,
          notes: isAFaturar ? `A faturar em ${dueDate}` : "",
        }),
      });
      const of = await ofRes.json();
      // For "a_faturar": don't create payment/cash entry — money not received yet
      if (!isAFaturar && of && of.id) {
        await fetch("/api/order-payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderFinancialId: of.id,
            calculationId: calc.id,
            amount: paidAmount,
            paymentMethod,
            date: today,
            notes: isEntrada50 ? "Entrada 50% — saldo restante na entrega" : "",
          }),
        });
      }
      toast({
        title: "Orçamento Autorizado",
        description: isAFaturar
          ? `A faturar em ${dueDate} — ${fmtBRL(totalPrice)} pendente no Financeiro.`
          : isEntrada50
            ? `Entrada registrada (50%). Saldo na entrega: ${fmtBRL(totalPrice * 0.5)}`
            : "Lançamento registrado no Financeiro.",
      });
    } catch {
      toast({ title: "Orçamento Autorizado", description: "Não foi possível registrar no Financeiro.", variant: "destructive" });
    }
    setPaymentModal(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja apagar este orçamento?')) {
      deleteCalculation(id);
      toast({ title: "Sucesso", description: "Orçamento apagado com sucesso." });
    }
  };

  const [, setLocation] = useLocation();

  const openViewPdf = (calc: Calculation) => {
    if (calc.details) {
      const draft = {
        ...calc.details,
        editingCalculationId: calc.id,
        editingCalculationDate: calc.date,
        autoOpenPdf: true
      };
      localStorage.setItem('calculator_draft', JSON.stringify(draft));
      setLocation("/");
    } else {
      toast({ title: "Sem dados salvos", description: "Este orçamento não possui dados completos para visualização.", variant: "destructive" });
    }
  };

  const openEditModal = (calc: Calculation) => {
    if (calc.details) {
      // Create draft from the saved details to load back into calculator
      const draft = {
        ...calc.details,
        editingCalculationId: calc.id,
        editingCalculationDate: calc.date
      };
      localStorage.setItem('calculator_draft', JSON.stringify(draft));
      
      toast({ title: "Carregado na Calculadora", description: "O orçamento foi carregado na calculadora para edição." });
      setLocation("/");
    } else {
      // Fallback for old calculations that don't have details saved
      setEditingCalc(calc);
      setEditFormData({
        clientName: calc.clientName || '',
        projectName: calc.projectName || '',
        totalCost: calc.totalCost || 0,
        suggestedPrice: calc.suggestedPrice || 0
      });
    }
  };

  const openViewModal = (calc: Calculation) => {
    setViewingCalc(calc);
  };

  const handleSaveEdit = () => {
    if (editingCalc) {
      updateCalculation({
        ...editingCalc,
        clientName: editFormData.clientName,
        projectName: editFormData.projectName,
        totalCost: Number(editFormData.totalCost),
        suggestedPrice: Number(editFormData.suggestedPrice)
      });
      toast({ title: "Sucesso", description: "Orçamento atualizado com sucesso." });
      setEditingCalc(null);
    }
  };

  // Get unique clients for filter (always from full history)
  const uniqueClients = Array.from(new Set(history.map(c => c.clientName || 'Cliente Não Identificado'))).sort();

  // Combined filter: client + status + period + search
  const filteredHistory = history.filter(calc => {
    // Client filter
    if (selectedClientFilter !== "all" && (calc.clientName || 'Cliente Não Identificado') !== selectedClientFilter) return false;

    // Status filter
    if (statusFilter !== "all") {
      const s = calc.status || 'pending';
      if (s !== statusFilter) return false;
    }

    // Period filter
    if (periodFilter !== "all") {
      const calcDate = new Date(calc.date);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const daysAgo = (d: number) => { const dt = new Date(today); dt.setDate(dt.getDate() - d); return dt; };
      if (periodFilter === "today" && calcDate < today) return false;
      if (periodFilter === "7d" && calcDate < daysAgo(7)) return false;
      if (periodFilter === "30d" && calcDate < daysAgo(30)) return false;
      if (periodFilter === "90d" && calcDate < daysAgo(90)) return false;
    }

    // Search filter
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      const matchClient = (calc.clientName || '').toLowerCase().includes(q);
      const matchProject = (calc.projectName || '').toLowerCase().includes(q);
      if (!matchClient && !matchProject) return false;
    }

    return true;
  });

  const hasActiveFilters = statusFilter !== "all" || periodFilter !== "all" || searchText.trim() !== "" || selectedClientFilter !== "all";

  // Agrupar por cliente
  const groupedHistory = filteredHistory.reduce((acc, calc) => {
    const client = calc.clientName || 'Cliente Não Identificado';
    if (!acc[client]) acc[client] = [];
    acc[client].push(calc);
    return acc;
  }, {} as Record<string, Calculation[]>);

  // Encontrar o cliente selecionado (caso tenha telefone e email)
  const getClientDetails = (clientName: string) => {
    return clients.find(c => c.name === clientName);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Histórico de Orçamentos</h1>
          <p className="text-muted-foreground mt-1">Consulte os orçamentos salvos, organizados por cliente.</p>
        </div>
        
        {uniqueClients.length > 0 && (
          <div className="flex items-center gap-3 bg-card p-2 rounded-xl border border-border shadow-sm w-full md:w-auto">
            <Search className="w-4 h-4 text-muted-foreground ml-2" />
            <Select value={selectedClientFilter} onValueChange={setSelectedClientFilter}>
              <SelectTrigger className="w-full md:w-[250px] border-none shadow-none focus:ring-0">
                <SelectValue placeholder="Filtrar por cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {uniqueClients.map(client => (
                  <SelectItem key={client} value={client}>{client}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-wrap gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="confirmed">Autorizado</SelectItem>
            <SelectItem value="denied">Não autorizado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-period-filter">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os períodos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar por cliente ou projeto"
            className="pl-9"
            data-testid="input-search-history"
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => { setStatusFilter("all"); setPeriodFilter("all"); setSearchText(""); setSelectedClientFilter("all"); }}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:border-foreground/30 transition-colors whitespace-nowrap self-center"
            data-testid="button-clear-filters"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {Object.keys(groupedHistory).length === 0 ? (
        <div className="bg-card rounded-2xl border border-card-border shadow-sm overflow-hidden p-12 flex flex-col items-center justify-center text-muted-foreground">
          <FileText className="w-12 h-12 mb-3 opacity-20" />
          <p>{history.length === 0 ? "Nenhum orçamento salvo no histórico." : hasActiveFilters ? "Nenhum orçamento encontrado para os filtros selecionados." : "Nenhum orçamento encontrado para este cliente."}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedHistory).map(([clientName, calcs]) => {
            const clientDetails = getClientDetails(clientName);
            
            return (
              <div key={clientName} className="bg-card rounded-2xl border border-card-border shadow-sm overflow-hidden">
                <div className="bg-secondary/20 px-6 py-5 border-b border-border/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                      {clientName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-foreground">{clientName}</h2>
                      {clientDetails && (
                        <p className="text-sm text-muted-foreground">
                          {clientDetails.whatsapp && `Tel: ${clientDetails.whatsapp} • `} 
                          {clientDetails.email && `Email: ${clientDetails.email}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold px-3 py-1 bg-secondary/50 rounded-full border border-border/50">
                    {calcs.length} {calcs.length === 1 ? 'Orçamento' : 'Orçamentos'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-secondary/10 border-b border-border/50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs whitespace-nowrap">Data</th>
                        <th className="px-3 sm:px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Projeto</th>
                        <th className="px-3 sm:px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs text-center hidden sm:table-cell">Status</th>
                        {isAdmin && (
                          <th className="px-3 sm:px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs text-right whitespace-nowrap hidden md:table-cell">Custo</th>
                        )}
                        <th className="px-3 sm:px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs text-right whitespace-nowrap">Valor Total</th>
                        {isAdmin && (
                          <th className="px-3 sm:px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs text-right whitespace-nowrap hidden md:table-cell">Lucro</th>
                        )}
                        <th className="px-3 sm:px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {calcs.map((calc) => {
                        const status = calc.status || 'pending';
                        
                        return (
                          <tr key={calc.id} className="hover:bg-secondary/5 transition-colors group relative z-10">
                            <td className="px-3 sm:px-6 py-4 text-muted-foreground whitespace-nowrap text-xs sm:text-sm">
                              {format(new Date(calc.date), "dd/MM/yy")}
                            </td>
                            <td className="px-3 sm:px-6 py-4 font-medium text-foreground text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">{calc.projectName}</td>
                            <td className="px-3 sm:px-6 py-4 justify-center items-center hidden sm:flex">
                              <div className="flex items-center gap-2 mt-1">
                                {status === 'confirmed' && (
                                  <>
                                    <div className="w-3 h-3 rounded-full bg-[#50c878] shadow-[0_0_8px_#50c878]"></div>
                                    <span className="text-xs font-semibold text-[#50c878]">Autorizado</span>
                                  </>
                                )}
                                {status === 'denied' && (
                                  <>
                                    <div className="w-3 h-3 rounded-full bg-[#ff6b6b] shadow-[0_0_8px_#ff6b6b]"></div>
                                    <span className="text-xs font-semibold text-[#ff6b6b]">Não Autorizado</span>
                                  </>
                                )}
                                {status === 'pending' && (
                                  <>
                                    <div className="w-3 h-3 rounded-full bg-[#ffc107] shadow-[0_0_8px_#ffc107]"></div>
                                    <span className="text-xs font-semibold text-[#ffc107]">Aguardando</span>
                                  </>
                                )}
                              </div>
                            </td>
                            {isAdmin && (
                              <td className="px-3 sm:px-6 py-4 font-mono text-muted-foreground text-right whitespace-nowrap text-xs sm:text-sm hidden md:table-cell">
                                {formatCurrency(calc.totalCost)}
                              </td>
                            )}
                            <td className="px-3 sm:px-6 py-4 font-mono font-bold text-[#ffc107] text-right whitespace-nowrap text-xs sm:text-sm">
                              {formatCurrency(calc.suggestedPrice)}
                            </td>
                            {isAdmin && (
                              <td className={`px-3 sm:px-6 py-4 font-mono font-bold text-right whitespace-nowrap text-xs sm:text-sm hidden md:table-cell ${(calc.suggestedPrice - calc.totalCost) >= 0 ? 'text-[#50c878]' : 'text-[#ff6b6b]'}`}>
                                {formatCurrency(calc.suggestedPrice - calc.totalCost)}
                              </td>
                            )}
                            <td className="px-3 sm:px-6 py-4 relative z-50">
                              <div className="flex justify-end gap-1.5 relative z-50 pointer-events-auto">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="text-muted-foreground hover:text-primary hover:bg-primary/10 p-2 rounded-lg transition-all border border-transparent hover:border-primary/20 cursor-pointer" title="Alterar Status">
                                      <Activity className="w-4 h-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(calc, 'pending'); }}>
                                      <Clock className="w-4 h-4 mr-2 text-[#ffc107]" />
                                      Marcar como Aguardando
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(calc, 'confirmed'); }}>
                                      <Check className="w-4 h-4 mr-2 text-[#50c878]" />
                                      Confirmar Autorização
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(calc, 'denied'); }}>
                                      <XCircle className="w-4 h-4 mr-2 text-[#ff6b6b]" />
                                      Não Autorizar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                
                                <div className="w-px h-6 bg-border mx-1 self-center"></div>
                                
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openViewModal(calc); }} className="text-muted-foreground hover:text-primary hover:bg-primary/10 p-2 rounded-lg transition-all border border-transparent hover:border-primary/20 cursor-pointer" title="Resumo do Orçamento">
                                  <Eye className="w-4 h-4 pointer-events-none" />
                                </button>
                                {calc.details && (
                                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openViewPdf(calc); }} className="text-muted-foreground hover:text-[#50c878] hover:bg-[#50c878]/10 p-2 rounded-lg transition-all border border-transparent hover:border-[#50c878]/20 cursor-pointer" title="Ver orçamento completo" data-testid={`button-view-pdf-${calc.id}`}>
                                    <FileText className="w-4 h-4 pointer-events-none" />
                                  </button>
                                )}
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(calc); }} className="text-muted-foreground hover:text-[#ffc107] hover:bg-[#ffc107]/10 p-2 rounded-lg transition-all border border-transparent hover:border-[#ffc107]/20 cursor-pointer" title="Editar Orçamento">
                                  <Edit2 className="w-4 h-4 pointer-events-none" />
                                </button>
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(calc.id); }} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-all border border-transparent hover:border-destructive/20 cursor-pointer" title="Apagar Orçamento">
                                  <Trash2 className="w-4 h-4 pointer-events-none" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Visualização */}
      <Dialog open={!!viewingCalc} onOpenChange={(open) => !open && setViewingCalc(null)}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-2xl">Detalhes do Orçamento</DialogTitle>
          </DialogHeader>
          
          {viewingCalc && (
            <div className="grid gap-6 py-4">
              <div className="bg-secondary/10 p-4 rounded-xl border border-border/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Cliente</p>
                    <p className="font-semibold text-lg">{viewingCalc.clientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Data</p>
                    <p className="font-semibold">{format(new Date(viewingCalc.date), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Projeto</p>
                    <p className="font-semibold text-lg">{viewingCalc.projectName}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-secondary/10 p-4 rounded-xl border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    {viewingCalc.status === 'confirmed' ? (
                      <><div className="w-3 h-3 rounded-full bg-[#50c878]"></div><span className="font-bold text-[#50c878]">Autorizado</span></>
                    ) : viewingCalc.status === 'denied' ? (
                      <><div className="w-3 h-3 rounded-full bg-[#ff6b6b]"></div><span className="font-bold text-[#ff6b6b]">Não Autorizado</span></>
                    ) : (
                      <><div className="w-3 h-3 rounded-full bg-[#ffc107]"></div><span className="font-bold text-[#ffc107]">Aguardando</span></>
                    )}
                  </div>
                </div>
                
                {isAdmin && (
                  <div className="bg-secondary/10 p-4 rounded-xl border border-border/50">
                    <p className="text-sm text-muted-foreground mb-1">Custo de Produção</p>
                    <p className="font-mono font-bold text-lg">{formatCurrency(viewingCalc.totalCost)}</p>
                  </div>
                )}
              </div>
              
              <div className="bg-[#ffc107]/10 p-6 rounded-xl border border-[#ffc107]/30 flex flex-col items-center justify-center">
                <p className="text-sm text-[#ffc107] mb-1 uppercase tracking-wider font-bold">Valor Final / Preço Sugerido</p>
                <p className="font-mono font-bold text-4xl text-[#ffc107]">{formatCurrency(viewingCalc.suggestedPrice)}</p>
              </div>
              
              {isAdmin && (
                <div className="bg-[#50c878]/10 p-4 rounded-xl border border-[#50c878]/30">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Custo</p>
                      <p className="font-mono font-bold text-lg">{formatCurrency(viewingCalc.totalCost)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Venda</p>
                      <p className="font-mono font-bold text-lg text-[#ffc107]">{formatCurrency(viewingCalc.suggestedPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Lucro</p>
                      <p className={`font-mono font-bold text-lg ${(viewingCalc.suggestedPrice - viewingCalc.totalCost) >= 0 ? 'text-[#50c878]' : 'text-[#ff6b6b]'}`}>
                        {formatCurrency(viewingCalc.suggestedPrice - viewingCalc.totalCost)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setViewingCalc(null)} className="w-full sm:w-auto">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={!!editingCalc} onOpenChange={(open) => !open && setEditingCalc(null)}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Editar Detalhes do Orçamento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="clientName">Nome do Cliente</Label>
                <Input 
                  id="clientName" 
                  value={editFormData.clientName}
                  onChange={(e) => setEditFormData({...editFormData, clientName: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="projectName">Nome do Projeto</Label>
                <Input 
                  id="projectName" 
                  value={editFormData.projectName}
                  onChange={(e) => setEditFormData({...editFormData, projectName: e.target.value})}
                />
              </div>
            </div>
            
            <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-2' : ''} gap-4`}>
              {isAdmin && (
                <div className="grid gap-2">
                  <Label htmlFor="totalCost">Custo de Produção (R$)</Label>
                  <Input 
                    id="totalCost" 
                    type="number"
                    step="0.01"
                    value={editFormData.totalCost}
                    onChange={(e) => setEditFormData({...editFormData, totalCost: Number(e.target.value)})}
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="suggestedPrice">Preço Sugerido / Final (R$)</Label>
                <Input 
                  id="suggestedPrice" 
                  type="number"
                  step="0.01"
                  value={editFormData.suggestedPrice}
                  onChange={(e) => setEditFormData({...editFormData, suggestedPrice: Number(e.target.value)})}
                  className="font-bold text-[#ffc107]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCalc(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Pagamento ao Autorizar */}
      <Dialog open={!!paymentModal} onOpenChange={(open) => !open && setPaymentModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <BookOpen className="w-5 h-5" />
              Autorizar Orçamento
            </DialogTitle>
          </DialogHeader>
          {paymentModal && (() => {
            const totalPrice = paymentModal.calc.suggestedPrice || paymentModal.calc.totalCost || 0;
            const isEntrada50 = paymentMethod === "entrada_50";
            const isAFaturar = paymentMethod === "a_faturar";
            return (
            <div className="space-y-4 py-2">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-semibold">{paymentModal.calc.clientName || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Projeto:</span>
                  <span className="font-semibold">{paymentModal.calc.projectName || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor total:</span>
                  <span className="font-bold text-green-700">{formatCurrency(totalPrice)}</span>
                </div>
              </div>

              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={(v) => {
                  setPaymentMethod(v);
                  if (v === "entrada_50") {
                    setPaymentAmount((totalPrice * 0.5).toFixed(2));
                  }
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((pm) => (
                      <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isEntrada50 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-amber-800 mb-1 uppercase tracking-wide">Resumo do Parcelamento</div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-amber-700 font-semibold">Entrada agora (50%)</div>
                      <div className="text-xs text-amber-600">Registrada no caixa hoje</div>
                    </div>
                    <span className="text-lg font-black text-green-700">{formatCurrency(totalPrice * 0.5)}</span>
                  </div>
                  <div className="border-t border-amber-200 pt-3 flex justify-between items-center">
                    <div>
                      <div className="text-xs text-amber-700 font-semibold">Saldo na entrega (50%)</div>
                      <div className="text-xs text-amber-600">Ficará como pendente no financeiro</div>
                    </div>
                    <span className="text-lg font-black text-orange-600">{formatCurrency(totalPrice * 0.5)}</span>
                  </div>
                </div>
              ) : isAFaturar ? (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-purple-800 mb-2 uppercase tracking-wide">Faturamento Futuro</div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-purple-700 font-semibold">Valor a receber:</span>
                    <span className="text-lg font-black text-purple-700">{formatCurrency(totalPrice)}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-purple-700 mb-1">Data de Faturamento *</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                    <p className="text-xs text-purple-600 mt-1">Data prevista para cobrança / recebimento</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Valor Pago (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="mt-1 font-bold"
                  />
                </div>
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                {isAFaturar
                  ? "Nenhum valor será lançado agora. O pedido ficará como Pendente no Financeiro até o recebimento."
                  : isEntrada50
                    ? "A entrada (50%) será lançada no Caixa. O saldo restante aparecerá como Parcial no Financeiro."
                    : "O lançamento será registrado automaticamente no Livro Caixa."}
              </div>
            </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModal(null)}>Cancelar</Button>
            <Button onClick={handleConfirmPayment} className="bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 mr-1" />
              Autorizar e Lançar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}