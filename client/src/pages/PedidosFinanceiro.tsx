import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Plus, ChevronDown, ChevronUp, Check, Clock, AlertCircle, X, Search, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" }, { value: "dinheiro", label: "Dinheiro" },
  { value: "credito", label: "Cartão de Crédito" }, { value: "debito", label: "Cartão de Débito" },
  { value: "boleto", label: "Boleto" }, { value: "transferencia", label: "Transferência" },
  { value: "entrada_50", label: "50% Entrada + 50% Entrega" },
  { value: "a_faturar", label: "A Faturar" }, { value: "outro", label: "Outro" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  parcial: { label: "Parcial", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
  pago: { label: "Pago", color: "bg-green-100 text-green-800", icon: Check },
  cancelado: { label: "Cancelado", color: "bg-gray-100 text-gray-500", icon: X },
};

type OrderFinancial = {
  id: string; userId: string; calculationId: string;
  clientName: string; projectName: string;
  totalAmount: number; amountPaid: number; amountPending: number;
  status: string; paymentMethod: string;
  firstPaymentDate: string; dueDate?: string; notes: string; createdAt: string;
  sellerUserId?: string | null; sellerName?: string | null;
};

type OrderPayment = {
  id: string; orderFinancialId: string; amount: number;
  paymentMethod: string; date: string; notes: string; createdAt: string;
};

export default function PedidosFinanceiro() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderFinancial[]>([]);
  const [payments, setPayments] = useState<Record<string, OrderPayment[]>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [payModal, setPayModal] = useState<OrderFinancial | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("pix");
  const [payNotes, setPayNotes] = useState("");
  const [payDate, setPayDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchOrders = async () => {
    try {
      const data = await fetch("/api/order-financials").then(r => r.json());
      setOrders(Array.isArray(data) ? data.sort((a: OrderFinancial, b: OrderFinancial) => b.createdAt.localeCompare(a.createdAt)) : []);
    } catch {} finally { setLoading(false); }
  };

  const fetchPayments = async (orderId: string) => {
    const data = await fetch(`/api/order-payments/${orderId}`).then(r => r.json());
    setPayments(prev => ({ ...prev, [orderId]: Array.isArray(data) ? data : [] }));
  };

  useEffect(() => { fetchOrders(); }, []);

  const toggleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    fetchPayments(id);
  };

  const filtered = orders.filter(o => {
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!o.clientName.toLowerCase().includes(s) && !o.projectName.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const handleRegisterPayment = async () => {
    if (!payModal) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) { toast({ title: "Valor inválido", variant: "destructive" }); return; }
    try {
      await fetch("/api/order-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderFinancialId: payModal.id,
          calculationId: payModal.calculationId,
          amount, paymentMethod: payMethod, date: payDate, notes: payNotes,
        }),
      });
      toast({ title: "Pagamento registrado!" });
      setPayModal(null);
      setPayAmount(""); setPayNotes("");
      await fetchOrders();
      if (expanded === payModal.id) await fetchPayments(payModal.id);
    } catch { toast({ title: "Erro ao registrar", variant: "destructive" }); }
  };

  const printOrder = (order: OrderFinancial, pmts: OrderPayment[]) => {
    const win = window.open("", "_blank");
    if (!win) return;
    const status = STATUS_CONFIG[order.status];
    win.document.write(`<html><head><title>Financeiro — ${order.clientName}</title>
    <style>
      @page{size:A4;margin:20mm 15mm}body{font-family:Arial,sans-serif;font-size:12px;color:#111}
      h1{font-size:18px;font-weight:bold;margin-bottom:4px}
      .meta{color:#555;font-size:11px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#111;color:#fff;padding:6px 8px;text-align:left;font-size:11px}
      td{padding:5px 8px;border-bottom:1px solid #eee;font-size:11px}
      .total{font-weight:bold;background:#f0f9ff}
      .badge{padding:2px 8px;border-radius:10px;font-size:10px;font-weight:bold}
      .footer{margin-top:24px;font-size:10px;color:#999;border-top:1px solid #ddd;padding-top:8px}
      button{position:fixed;top:16px;right:16px;padding:8px 20px;background:#111;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px}
      @media print{button{display:none}}
    </style></head><body>
    <button onclick="window.print()">🖨️ Salvar PDF</button>
    <h1>Financeiro por Pedido — C3D Manager 1.0®</h1>
    <div class="meta">
      <div><strong>Cliente:</strong> ${order.clientName || "—"}</div>
      <div><strong>Projeto:</strong> ${order.projectName || "—"}</div>
      <div><strong>Status:</strong> ${status?.label || order.status}</div>
      <div><strong>Gerado em:</strong> ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</div>
    </div>
    <table>
      <tr><th colspan="2">Resumo Financeiro</th></tr>
      <tr><td>Valor Total do Pedido</td><td style="text-align:right;font-weight:bold">${fmtCurrency(order.totalAmount)}</td></tr>
      <tr><td>Valor Recebido</td><td style="text-align:right;color:green;font-weight:bold">${fmtCurrency(order.amountPaid)}</td></tr>
      <tr><td>Saldo Pendente</td><td style="text-align:right;color:red;font-weight:bold">${fmtCurrency(order.amountPending)}</td></tr>
    </table>
    <br>
    <table>
      <thead><tr><th>Data</th><th>Forma de Pagamento</th><th>Observações</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>
        ${pmts.map(p => `<tr>
          <td>${p.date}</td>
          <td>${PAYMENT_METHODS.find(m => m.value === p.paymentMethod)?.label || p.paymentMethod}</td>
          <td>${p.notes || "—"}</td>
          <td style="text-align:right;font-weight:bold">${fmtCurrency(p.amount)}</td>
        </tr>`).join("")}
        <tr class="total"><td colspan="3">Total Recebido</td><td style="text-align:right">${fmtCurrency(order.amountPaid)}</td></tr>
      </tbody>
    </table>
    <div class="footer">C3D Manager 1.0® — Financeiro por Pedido — ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</div>
    </body></html>`);
    win.document.close();
  };

  if (loading) return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financeiro por Pedido</h1>
            <p className="text-sm text-muted-foreground">Controle de recebimentos por orçamento aprovado</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(STATUS_CONFIG).filter(([k]) => k !== "cancelado").map(([key, cfg]) => {
          const count = orders.filter(o => o.status === key).length;
          const total = orders.filter(o => o.status === key).reduce((s, o) => s + o.amountPending, 0);
          return (
            <div key={key} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mb-2 ${cfg.color}`}>
                <cfg.icon className="w-3 h-3" />
                {cfg.label}
              </div>
              <div className="text-xl font-black text-gray-900">{count}</div>
              {key !== "pago" && <div className="text-xs text-muted-foreground">Pendente: {fmtCurrency(total)}</div>}
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente ou projeto..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="all">Todos</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-muted-foreground text-sm">
          <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum pedido financeiro encontrado</p>
          <p className="text-xs mt-1">Pedidos aparecem ao confirmar orçamentos no Histórico</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pendente;
            const pct = order.totalAmount > 0 ? Math.min(100, (order.amountPaid / order.totalAmount) * 100) : 0;
            const isExpanded = expanded === order.id;
            const orderPayments = payments[order.id] || [];
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cfg.color}`}>
                        <cfg.icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="font-bold text-gray-900">{order.clientName || "Cliente"}</div>
                    <div className="text-sm text-muted-foreground">{order.projectName || "—"}</div>
                    {order.sellerName && (
                      <div className="text-xs text-blue-500 font-semibold mt-0.5">Vendedor: {order.sellerName}</div>
                    )}
                    {order.paymentMethod === "a_faturar" && order.dueDate && (() => {
                      const due = new Date(order.dueDate + "T00:00:00");
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      const isOverdue = order.status !== "pago" && due < today;
                      return (
                        <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${isOverdue ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700"}`}>
                          <Clock className="w-3 h-3" />
                          {isOverdue ? "Vencido em " : "A faturar em "}{order.dueDate}
                        </div>
                      );
                    })()}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{fmtCurrency(order.amountPaid)} recebido</span>
                        <span>{fmtCurrency(order.totalAmount)} total</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      {order.amountPending > 0 && (
                        <div className="text-xs text-red-600 mt-1">Pendente: {fmtCurrency(order.amountPending)}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {order.status !== "pago" && order.status !== "cancelado" && (
                      <button onClick={() => { setPayModal(order); setPayAmount(order.amountPending.toFixed(2)); setPayMethod("pix"); setPayNotes(""); setPayDate(format(new Date(), "yyyy-MM-dd")); }}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700 transition-colors flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Receber
                      </button>
                    )}
                    <button onClick={() => { if (!isExpanded) fetchPayments(order.id); printOrder(order, isExpanded ? orderPayments : []); }}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors flex items-center gap-1">
                      <Printer className="w-3 h-3" /> PDF
                    </button>
                    <button onClick={() => toggleExpand(order.id)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors flex items-center gap-1">
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      Histórico
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    {orderPayments.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground">Nenhum recebimento registrado</div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left px-4 py-2 font-semibold text-gray-500">Data</th>
                            <th className="text-left px-4 py-2 font-semibold text-gray-500">Forma</th>
                            <th className="text-left px-4 py-2 font-semibold text-gray-500">Obs.</th>
                            <th className="text-right px-4 py-2 font-semibold text-gray-500">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderPayments.map(p => (
                            <tr key={p.id} className="border-b border-gray-50">
                              <td className="px-4 py-2">{p.date}</td>
                              <td className="px-4 py-2">{PAYMENT_METHODS.find(m => m.value === p.paymentMethod)?.label || p.paymentMethod}</td>
                              <td className="px-4 py-2 text-gray-500">{p.notes || "—"}</td>
                              <td className="px-4 py-2 text-right font-bold text-green-700">{fmtCurrency(p.amount)}</td>
                            </tr>
                          ))}
                          <tr className="bg-green-50">
                            <td colSpan={3} className="px-4 py-2 font-bold text-gray-700">Total Recebido</td>
                            <td className="px-4 py-2 text-right font-black text-green-700">{fmtCurrency(order.amountPaid)}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Registrar Recebimento</h2>
              <button onClick={() => setPayModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm space-y-0.5">
              <div><span className="text-muted-foreground">Cliente: </span><strong>{payModal.clientName}</strong></div>
              <div><span className="text-muted-foreground">Pendente: </span><strong className="text-red-600">{fmtCurrency(payModal.amountPending)}</strong></div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Valor (R$)</label>
                  <input type="number" step="0.01" min="0" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Data</label>
                  <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Forma de Pagamento</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {PAYMENT_METHODS.map(pm => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Observações</label>
                <input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Opcional"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setPayModal(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleRegisterPayment}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
