import { useState, useEffect, useRef } from "react";
import { format, parseISO, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BookOpen, Plus, Trash2, Lock, TrendingUp, Wallet, CreditCard, Search, X, Printer, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type CashEntry = {
  id: string;
  userId: string;
  calculationId?: string | null;
  clientName: string;
  projectName: string;
  description: string;
  amount: number;
  paymentMethod: string;
  date: string;
  closingId?: string | null;
  notes?: string | null;
};

type CashClosing = {
  id: string;
  userId: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  entryCount: number;
  closedAt: string;
  notes?: string | null;
};

const PAYMENT_METHODS = [
  { value: "pix", label: "Pix", color: "bg-green-100 text-green-800" },
  { value: "dinheiro", label: "Dinheiro", color: "bg-yellow-100 text-yellow-800" },
  { value: "credito", label: "Cartão de Crédito", color: "bg-blue-100 text-blue-800" },
  { value: "debito", label: "Cartão de Débito", color: "bg-indigo-100 text-indigo-800" },
  { value: "boleto", label: "Boleto", color: "bg-orange-100 text-orange-800" },
  { value: "transferencia", label: "Transferência", color: "bg-purple-100 text-purple-800" },
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const getPaymentLabel = (value: string) =>
  PAYMENT_METHODS.find((p) => p.value === value)?.label || value;

const getPaymentColor = (value: string) =>
  PAYMENT_METHODS.find((p) => p.value === value)?.color || "bg-gray-100 text-gray-800";

export default function CashBook() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [closings, setClosings] = useState<CashClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"entries" | "closings">("entries");

  const [filterPayment, setFilterPayment] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"open" | "closed" | "all">("open");
  const [filterDateFrom, setFilterDateFrom] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterDateTo, setFilterDateTo] = useState(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [searchTerm, setSearchTerm] = useState("");

  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    clientName: "", projectName: "", description: "", amount: "",
    paymentMethod: "pix", date: format(new Date(), "yyyy-MM-dd"), notes: ""
  });

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeNotes, setCloseNotes] = useState("");
  const [closePeriodLabel, setClosePeriodLabel] = useState(() =>
    format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })
  );

  const [expandedClosing, setExpandedClosing] = useState<string | null>(null);
  const balanceRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      const [e, c] = await Promise.all([
        fetch("/api/cash-entries").then((r) => r.json()),
        fetch("/api/cash-closings").then((r) => r.json()),
      ]);
      setEntries(Array.isArray(e) ? e : []);
      setClosings(Array.isArray(c) ? c : []);
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar os dados.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredEntries = entries.filter((e) => {
    if (filterStatus === "open" && e.closingId) return false;
    if (filterStatus === "closed" && !e.closingId) return false;
    if (filterPayment !== "all" && e.paymentMethod !== filterPayment) return false;
    if (filterDateFrom && e.date < filterDateFrom) return false;
    if (filterDateTo && e.date > filterDateTo) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (!e.clientName.toLowerCase().includes(s) && !e.projectName.toLowerCase().includes(s) && !e.description.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const openEntries = entries.filter((e) => !e.closingId);

  const totalFiltered = filteredEntries.reduce((s, e) => s + e.amount, 0);
  const totalOpen = openEntries.reduce((s, e) => s + e.amount, 0);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const totalToday = openEntries.filter((e) => e.date === todayStr).reduce((s, e) => s + e.amount, 0);

  const byPayment = PAYMENT_METHODS.map((pm) => ({
    ...pm,
    total: filteredEntries.filter((e) => e.paymentMethod === pm.value).reduce((s, e) => s + e.amount, 0),
  })).filter((pm) => pm.total > 0);

  const handleAddEntry = async () => {
    if (!newEntry.description && !newEntry.clientName && !newEntry.projectName) {
      toast({ title: "Preencha ao menos uma descrição ou cliente", variant: "destructive" }); return;
    }
    if (!newEntry.amount || Number(newEntry.amount) <= 0) {
      toast({ title: "Valor inválido", variant: "destructive" }); return;
    }
    try {
      const res = await fetch("/api/cash-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newEntry, amount: Number(newEntry.amount) }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setEntries((prev) => [...prev, created]);
      setNewEntry({ clientName: "", projectName: "", description: "", amount: "", paymentMethod: "pix", date: format(new Date(), "yyyy-MM-dd"), notes: "" });
      setShowNewEntry(false);
      toast({ title: "Lançamento adicionado!" });
    } catch {
      toast({ title: "Erro ao adicionar lançamento", variant: "destructive" });
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm("Excluir este lançamento?")) return;
    try {
      await fetch(`/api/cash-entries/${id}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast({ title: "Lançamento excluído" });
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const handleClosePeriod = async () => {
    const toClose = openEntries.filter((e) => {
      if (filterDateFrom && e.date < filterDateFrom) return false;
      if (filterDateTo && e.date > filterDateTo) return false;
      return true;
    });
    if (toClose.length === 0) {
      toast({ title: "Nenhum lançamento aberto no período selecionado", variant: "destructive" }); return;
    }
    const total = toClose.reduce((s, e) => s + e.amount, 0);
    try {
      const res = await fetch("/api/cash-closings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodLabel: closePeriodLabel,
          periodStart: filterDateFrom,
          periodEnd: filterDateTo,
          totalAmount: total,
          entryCount: toClose.length,
          notes: closeNotes,
          entryIds: toClose.map((e) => e.id),
        }),
      });
      if (!res.ok) throw new Error();
      await fetchData();
      setShowCloseModal(false);
      setCloseNotes("");
      toast({ title: "Caixa fechado!", description: `${toClose.length} lançamentos — ${formatCurrency(total)}` });
    } catch {
      toast({ title: "Erro ao fechar caixa", variant: "destructive" });
    }
  };

  const printBalance = (closing: CashClosing) => {
    const closingEntries = entries.filter((e) => e.closingId === closing.id);
    const byPm = PAYMENT_METHODS.map((pm) => ({
      ...pm,
      total: closingEntries.filter((e) => e.paymentMethod === pm.value).reduce((s, e) => s + e.amount, 0),
    })).filter((pm) => pm.total > 0);

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Balanço — ${closing.periodLabel}</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;max-width:700px;margin:0 auto}
      h1{font-size:22px;font-weight:bold}h2{font-size:16px;color:#555;margin-top:20px}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th{background:#f3f4f6;padding:8px 12px;text-align:left;font-size:13px}
      td{padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px}
      .total{font-size:18px;font-weight:bold;margin-top:20px}
      .footer{margin-top:40px;font-size:11px;color:#999;border-top:1px solid #e5e7eb;padding-top:10px}
      @media print{button{display:none}}</style></head><body>
      <button onclick="window.print()" style="margin-bottom:20px;padding:8px 16px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨️ Imprimir</button>
      <h1>Balanço de Caixa</h1>
      <p><strong>Período:</strong> ${closing.periodLabel}</p>
      <p><strong>De:</strong> ${closing.periodStart} &nbsp; <strong>Até:</strong> ${closing.periodEnd}</p>
      <p><strong>Fechado em:</strong> ${format(parseISO(closing.closedAt), "dd/MM/yyyy 'às' HH:mm")}</p>
      ${closing.notes ? `<p><strong>Obs:</strong> ${closing.notes}</p>` : ""}
      <h2>Resumo por Forma de Pagamento</h2>
      <table><tr><th>Forma de Pagamento</th><th>Total</th></tr>
      ${byPm.map((pm) => `<tr><td>${pm.label}</td><td>${formatCurrency(pm.total)}</td></tr>`).join("")}
      </table>
      <div class="total">Total Geral: ${formatCurrency(closing.totalAmount)}</div>
      <h2>Lançamentos (${closingEntries.length})</h2>
      <table><tr><th>Data</th><th>Cliente</th><th>Projeto/Descrição</th><th>Pagamento</th><th>Valor</th></tr>
      ${closingEntries.map((e) => `<tr>
        <td>${e.date}</td>
        <td>${e.clientName || "—"}</td>
        <td>${e.projectName || e.description || "—"}</td>
        <td>${getPaymentLabel(e.paymentMethod)}</td>
        <td>${formatCurrency(e.amount)}</td>
      </tr>`).join("")}
      </table>
      <div class="footer">Gerado pelo C3D Manager 1.0® — ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</div>
      </body></html>
    `);
    win.document.close();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-muted-foreground text-sm">Carregando...</div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Livro Caixa</h1>
            <p className="text-sm text-muted-foreground">Gestão financeira e fechamento de caixa</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCloseModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm"
          >
            <Lock className="w-4 h-4" />
            Fechar Caixa
          </button>
          <button
            onClick={() => setShowNewEntry(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm font-semibold text-gray-500">Em Aberto</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalOpen)}</div>
          <div className="text-xs text-muted-foreground mt-1">{openEntries.length} lançamentos</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-gray-500">Hoje</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalToday)}</div>
          <div className="text-xs text-muted-foreground mt-1">{format(new Date(), "dd/MM/yyyy")}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-sm font-semibold text-gray-500">Filtro Atual</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalFiltered)}</div>
          <div className="text-xs text-muted-foreground mt-1">{filteredEntries.length} lançamentos</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("entries")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "entries" ? "bg-white text-gray-900 shadow-sm" : "text-muted-foreground hover:text-gray-700"}`}
        >
          Lançamentos
        </button>
        <button
          onClick={() => setActiveTab("closings")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "closings" ? "bg-white text-gray-900 shadow-sm" : "text-muted-foreground hover:text-gray-700"}`}
        >
          Fechamentos ({closings.length})
        </button>
      </div>

      {activeTab === "entries" && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">DE</label>
                <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">ATÉ</label>
                <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">PAGAMENTO</label>
                <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50">
                  <option value="all">Todos</option>
                  {PAYMENT_METHODS.map((pm) => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">STATUS</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50">
                  <option value="open">Em Aberto</option>
                  <option value="closed">Fechados</option>
                  <option value="all">Todos</option>
                </select>
              </div>
            </div>
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cliente, projeto ou descrição..."
                className="w-full bg-input border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
          </div>

          {/* By payment method summary */}
          {byPayment.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {byPayment.map((pm) => (
                <div key={pm.value} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${pm.color}`}>
                  {pm.label}: {formatCurrency(pm.total)}
                </div>
              ))}
            </div>
          )}

          {/* Entries Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {filteredEntries.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum lançamento encontrado</p>
                <p className="text-xs mt-1">Ajuste os filtros ou adicione um novo lançamento</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Data</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Cliente / Projeto</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Descrição</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Pagamento</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Valor</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredEntries
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{entry.date}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900 text-sm">{entry.clientName || "—"}</div>
                            {entry.projectName && <div className="text-xs text-muted-foreground">{entry.projectName}</div>}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-sm max-w-[200px] truncate">{entry.description || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPaymentColor(entry.paymentMethod)}`}>
                              {getPaymentLabel(entry.paymentMethod)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">{formatCurrency(entry.amount)}</td>
                          <td className="px-4 py-3 text-center">
                            {entry.closingId
                              ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Fechado</span>
                              : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Aberto</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {!entry.closingId && (
                              <button onClick={() => handleDeleteEntry(entry.id)}
                                className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-700">Total ({filteredEntries.length} lançamentos)</td>
                      <td className="px-4 py-3 text-right text-base font-black text-primary">{formatCurrency(totalFiltered)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "closings" && (
        <div className="space-y-4">
          {closings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-muted-foreground text-sm">
              <Lock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum fechamento realizado ainda</p>
            </div>
          ) : (
            closings
              .sort((a, b) => b.closedAt.localeCompare(a.closedAt))
              .map((closing) => {
                const closingEntries = entries.filter((e) => e.closingId === closing.id);
                const byPm = PAYMENT_METHODS.map((pm) => ({
                  ...pm,
                  total: closingEntries.filter((e) => e.paymentMethod === pm.value).reduce((s, e) => s + e.amount, 0),
                })).filter((pm) => pm.total > 0);
                const isExpanded = expandedClosing === closing.id;

                return (
                  <div key={closing.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                          <Lock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{closing.periodLabel}</div>
                          <div className="text-xs text-muted-foreground">
                            {closing.periodStart} → {closing.periodEnd} • {closing.entryCount} lançamentos
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Fechado em {format(parseISO(closing.closedAt), "dd/MM/yyyy 'às' HH:mm")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xl font-black text-gray-900">{formatCurrency(closing.totalAmount)}</div>
                          <div className="flex flex-wrap gap-1 justify-end mt-1">
                            {byPm.map((pm) => (
                              <span key={pm.value} className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${pm.color}`}>
                                {pm.label}: {formatCurrency(pm.total)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => printBalance(closing)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Imprimir Balanço">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => setExpandedClosing(isExpanded ? null : closing.id)}
                            className="p-2 text-muted-foreground hover:bg-gray-100 rounded-lg transition-colors">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && closingEntries.length > 0 && (
                      <div className="border-t border-gray-100 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="text-left px-4 py-2 font-semibold text-gray-500">Data</th>
                              <th className="text-left px-4 py-2 font-semibold text-gray-500">Cliente</th>
                              <th className="text-left px-4 py-2 font-semibold text-gray-500">Projeto/Descrição</th>
                              <th className="text-left px-4 py-2 font-semibold text-gray-500">Pagamento</th>
                              <th className="text-right px-4 py-2 font-semibold text-gray-500">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {closingEntries.map((e) => (
                              <tr key={e.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-gray-600">{e.date}</td>
                                <td className="px-4 py-2 text-gray-800">{e.clientName || "—"}</td>
                                <td className="px-4 py-2 text-gray-600">{e.projectName || e.description || "—"}</td>
                                <td className="px-4 py-2">
                                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${getPaymentColor(e.paymentMethod)}`}>
                                    {getPaymentLabel(e.paymentMethod)}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right font-bold text-gray-900">{formatCurrency(e.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* New Entry Modal */}
      {showNewEntry && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Novo Lançamento</h2>
              <button onClick={() => setShowNewEntry(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Cliente</label>
                  <input value={newEntry.clientName} onChange={(e) => setNewEntry({ ...newEntry, clientName: e.target.value })}
                    placeholder="Nome do cliente"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Projeto</label>
                  <input value={newEntry.projectName} onChange={(e) => setNewEntry({ ...newEntry, projectName: e.target.value })}
                    placeholder="Nome do projeto"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Descrição</label>
                <input value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                  placeholder="Descrição do lançamento"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Valor (R$)</label>
                  <input type="number" step="0.01" min="0" value={newEntry.amount} onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                    placeholder="0,00"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Data</label>
                  <input type="date" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Forma de Pagamento</label>
                <select value={newEntry.paymentMethod} onChange={(e) => setNewEntry({ ...newEntry, paymentMethod: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {PAYMENT_METHODS.map((pm) => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Observações (opcional)</label>
                <input value={newEntry.notes} onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                  placeholder="Anotações..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowNewEntry(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleAddEntry}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Period Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Fechar Caixa</h2>
              <button onClick={() => setShowCloseModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-800">
              Serão fechados todos os lançamentos <strong>em aberto</strong> no período{" "}
              <strong>{filterDateFrom}</strong> → <strong>{filterDateTo}</strong>.
              Lançamentos fechados não podem ser excluídos.
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Rótulo do Período</label>
                <input value={closePeriodLabel} onChange={(e) => setClosePeriodLabel(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Observações (opcional)</label>
                <textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)}
                  rows={3} placeholder="Notas sobre este fechamento..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCloseModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleClosePeriod}
                className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors">
                <Lock className="w-4 h-4 inline mr-1.5" />
                Fechar Caixa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
