import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wallet, Lock, Unlock, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Check, Printer, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" }, { value: "dinheiro", label: "Dinheiro" },
  { value: "credito", label: "Cartão de Crédito" }, { value: "debito", label: "Cartão de Débito" },
  { value: "boleto", label: "Boleto" }, { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
];

type DailyCash = {
  id: string; userId: string; date: string; status: string;
  openingBalance: number; totalIn: number; totalOut: number;
  closingBalance: number; reportedBalance?: number; difference?: number;
  openedAt: string; closedAt?: string; notes: string;
  paymentSummary?: Record<string, number>;
};

type CashEntry = {
  id: string; date: string; clientName: string; projectName: string;
  description: string; amount: number; paymentMethod: string;
  type: string; category: string; status: string;
};

export default function CaixaDiario() {
  const { toast } = useToast();
  const [todayDc, setTodayDc] = useState<DailyCash | null>(null);
  const [allDc, setAllDc] = useState<DailyCash[]>([]);
  const [todayEntries, setTodayEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingBalance, setOpeningBalance] = useState("0");
  const [openNotes, setOpenNotes] = useState("");
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [reportedBalance, setReportedBalance] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const today = format(new Date(), "yyyy-MM-dd");

  const fetchAll = async () => {
    try {
      const [dcRes, allDcRes, entriesRes] = await Promise.all([
        fetch("/api/daily-cash/today").then(r => r.json()),
        fetch("/api/daily-cash").then(r => r.json()),
        fetch("/api/cash-entries").then(r => r.json()),
      ]);
      setTodayDc(dcRes);
      setAllDc(Array.isArray(allDcRes) ? allDcRes.sort((a: DailyCash, b: DailyCash) => b.date.localeCompare(a.date)) : []);
      const entries = Array.isArray(entriesRes) ? entriesRes : [];
      setTodayEntries(entries.filter((e: CashEntry) => e.date === today && e.status !== "cancelado"));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleOpen = async () => {
    try {
      const res = await fetch("/api/daily-cash/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingBalance: Number(openingBalance) || 0, notes: openNotes }),
      });
      if (!res.ok) { const e = await res.json(); toast({ title: e.message || "Erro ao abrir caixa", variant: "destructive" }); return; }
      await fetchAll();
      toast({ title: "Caixa aberto!" });
    } catch { toast({ title: "Erro ao abrir caixa", variant: "destructive" }); }
  };

  const handleClose = async () => {
    if (!todayDc) return;
    try {
      const res = await fetch(`/api/daily-cash/${todayDc.id}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportedBalance: reportedBalance ? Number(reportedBalance) : undefined, notes: closeNotes }),
      });
      if (!res.ok) { toast({ title: "Erro ao fechar caixa", variant: "destructive" }); return; }
      await fetchAll();
      setShowCloseModal(false);
      toast({ title: "Caixa fechado com sucesso!" });
    } catch { toast({ title: "Erro ao fechar caixa", variant: "destructive" }); }
  };

  const totalIn = todayEntries.filter(e => e.type === "entrada").reduce((s, e) => s + e.amount, 0);
  const totalOut = todayEntries.filter(e => e.type === "saida").reduce((s, e) => s + e.amount, 0);
  const projectedClosing = (todayDc?.openingBalance || 0) + totalIn - totalOut;

  const byPayment = PAYMENT_METHODS.map(pm => ({
    ...pm,
    totalIn: todayEntries.filter(e => e.paymentMethod === pm.value && e.type === "entrada").reduce((s, e) => s + e.amount, 0),
    totalOut: todayEntries.filter(e => e.paymentMethod === pm.value && e.type === "saida").reduce((s, e) => s + e.amount, 0),
  })).filter(pm => pm.totalIn > 0 || pm.totalOut > 0);

  const printClose = (dc: DailyCash) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Fechamento de Caixa — ${dc.date}</title>
    <style>
      @page{size:A4;margin:20mm 15mm}body{font-family:Arial,sans-serif;font-size:12px;color:#111}
      h1{font-size:18px;font-weight:bold;margin-bottom:4px}.meta{color:#555;font-size:11px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#111;color:#fff;padding:6px 8px;text-align:left;font-size:11px}
      td{padding:5px 8px;border-bottom:1px solid #eee;font-size:11px}
      .diff-ok{color:green;font-weight:bold}.diff-bad{color:red;font-weight:bold}
      button{position:fixed;top:16px;right:16px;padding:8px 20px;background:#111;color:#fff;border:none;border-radius:6px;cursor:pointer}
      @media print{button{display:none}}
    </style></head><body>
    <button onclick="window.print()">🖨️ Salvar PDF</button>
    <h1>Fechamento de Caixa — C3D Manager 1.0®</h1>
    <div class="meta">
      <div><strong>Data:</strong> ${dc.date}</div>
      <div><strong>Abertura:</strong> ${dc.openedAt ? format(parseISO(dc.openedAt), "dd/MM/yyyy 'às' HH:mm") : "—"}</div>
      <div><strong>Fechamento:</strong> ${dc.closedAt ? format(parseISO(dc.closedAt), "dd/MM/yyyy 'às' HH:mm") : "—"}</div>
    </div>
    <table>
      <tr><th colspan="2">Resumo do Caixa</th></tr>
      <tr><td>Saldo Inicial</td><td style="text-align:right">${fmtCurrency(dc.openingBalance)}</td></tr>
      <tr><td>Total de Entradas</td><td style="text-align:right;color:green">${fmtCurrency(dc.totalIn)}</td></tr>
      <tr><td>Total de Saídas</td><td style="text-align:right;color:red">${fmtCurrency(dc.totalOut)}</td></tr>
      <tr><td><strong>Saldo Calculado</strong></td><td style="text-align:right;font-weight:bold">${fmtCurrency(dc.closingBalance)}</td></tr>
      ${dc.reportedBalance != null ? `
      <tr><td>Saldo Informado</td><td style="text-align:right">${fmtCurrency(dc.reportedBalance)}</td></tr>
      <tr><td><strong>Diferença</strong></td><td style="text-align:right" class="${(dc.difference || 0) === 0 ? "diff-ok" : "diff-bad"}">${fmtCurrency(dc.difference || 0)}</td></tr>
      ` : ""}
      ${dc.notes ? `<tr><td colspan="2"><em>Obs: ${dc.notes}</em></td></tr>` : ""}
    </table>
    </body></html>`);
    win.document.close();
  };

  if (loading) return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Caixa Diário</h1>
            <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
          </div>
        </div>
        {todayDc?.status === "aberto" && (
          <button onClick={() => { setReportedBalance(projectedClosing.toFixed(2)); setCloseNotes(""); setShowCloseModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors shadow-sm">
            <Lock className="w-4 h-4" /> Fechar Caixa
          </button>
        )}
      </div>

      {/* Today Status */}
      {!todayDc ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
          <Unlock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Caixa não aberto hoje</h2>
          <p className="text-sm text-muted-foreground mb-6">Informe o saldo inicial e abra o caixa para começar a registrar movimentações</p>
          <div className="max-w-xs mx-auto space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block text-left">Saldo Inicial (R$)</label>
              <input type="number" step="0.01" min="0" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block text-left">Observações (opcional)</label>
              <input value={openNotes} onChange={e => setOpenNotes(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <button onClick={handleOpen}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
              <Unlock className="w-4 h-4" /> Abrir Caixa
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Status Banner */}
          <div className={`rounded-2xl p-4 flex items-center gap-3 ${todayDc.status === "aberto" ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}>
            {todayDc.status === "aberto"
              ? <Unlock className="w-5 h-5 text-green-600 flex-shrink-0" />
              : <Lock className="w-5 h-5 text-gray-600 flex-shrink-0" />}
            <div className="text-sm">
              <strong>{todayDc.status === "aberto" ? "Caixa Aberto" : "Caixa Fechado"}</strong>
              {" — "}Saldo inicial: {fmtCurrency(todayDc.openingBalance)}
              {todayDc.status === "aberto" && todayDc.openedAt && ` | Aberto às ${format(parseISO(todayDc.openedAt), "HH:mm")}`}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="text-xs font-bold text-gray-400 mb-1">Saldo Inicial</div>
              <div className="text-lg font-black text-gray-700">{fmtCurrency(todayDc.openingBalance)}</div>
            </div>
            <div className="bg-green-50 rounded-2xl p-4 border border-green-100 shadow-sm">
              <div className="flex items-center gap-1 text-xs font-bold text-green-500 mb-1">
                <ArrowUpCircle className="w-3.5 h-3.5" /> Entradas
              </div>
              <div className="text-lg font-black text-green-700">{fmtCurrency(todayDc.status === "aberto" ? totalIn : todayDc.totalIn)}</div>
            </div>
            <div className="bg-red-50 rounded-2xl p-4 border border-red-100 shadow-sm">
              <div className="flex items-center gap-1 text-xs font-bold text-red-500 mb-1">
                <ArrowDownCircle className="w-3.5 h-3.5" /> Saídas
              </div>
              <div className="text-lg font-black text-red-700">{fmtCurrency(todayDc.status === "aberto" ? totalOut : todayDc.totalOut)}</div>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 shadow-sm">
              <div className="text-xs font-bold text-blue-500 mb-1">Saldo {todayDc.status === "aberto" ? "Projetado" : "Final"}</div>
              <div className="text-lg font-black text-blue-700">{fmtCurrency(todayDc.status === "aberto" ? projectedClosing : todayDc.closingBalance)}</div>
            </div>
          </div>

          {/* Fechamento Info */}
          {todayDc.status === "fechado" && todayDc.reportedBalance != null && (
            <div className={`rounded-2xl p-5 border ${(todayDc.difference || 0) === 0 ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}>
              <div className="flex items-center gap-2 mb-3">
                {(todayDc.difference || 0) === 0
                  ? <Check className="w-5 h-5 text-green-600" />
                  : <AlertTriangle className="w-5 h-5 text-orange-500" />}
                <span className="font-bold text-gray-800">Conciliação do Fechamento</span>
                <button onClick={() => printClose(todayDc)} className="ml-auto p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
                  <Printer className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                  <div className="text-xs text-muted-foreground mb-1">Saldo do Sistema</div>
                  <div className="font-bold">{fmtCurrency(todayDc.closingBalance)}</div>
                </div>
                <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                  <div className="text-xs text-muted-foreground mb-1">Saldo Informado</div>
                  <div className="font-bold">{fmtCurrency(todayDc.reportedBalance)}</div>
                </div>
                <div className={`rounded-xl p-3 text-center border ${(todayDc.difference || 0) === 0 ? "bg-green-100 border-green-200" : "bg-orange-100 border-orange-200"}`}>
                  <div className="text-xs text-muted-foreground mb-1">Diferença</div>
                  <div className={`font-black ${(todayDc.difference || 0) === 0 ? "text-green-700" : "text-orange-700"}`}>
                    {fmtCurrency(todayDc.difference || 0)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* By Payment */}
          {byPayment.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Por Forma de Pagamento (hoje)</h3>
              <div className="space-y-2">
                {byPayment.map(pm => (
                  <div key={pm.value} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-600">{pm.label}</span>
                    <div className="flex gap-4">
                      {pm.totalIn > 0 && <span className="text-green-700 font-semibold">+{fmtCurrency(pm.totalIn)}</span>}
                      {pm.totalOut > 0 && <span className="text-red-700 font-semibold">-{fmtCurrency(pm.totalOut)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Entries */}
          {todayDc.status === "aberto" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50">
                <h3 className="text-sm font-bold text-gray-700">Movimentações de Hoje ({todayEntries.length})</h3>
              </div>
              {todayEntries.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação hoje — lance pelo Livro Caixa</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2 text-xs font-bold text-gray-500">Cliente / Descrição</th>
                        <th className="text-left px-4 py-2 text-xs font-bold text-gray-500">Pagamento</th>
                        <th className="text-right px-4 py-2 text-xs font-bold text-gray-500">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayEntries.map(e => (
                        <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-2">
                            <div className="font-semibold text-gray-800">{e.clientName || e.description || "—"}</div>
                            {e.projectName && <div className="text-xs text-muted-foreground">{e.projectName}</div>}
                          </td>
                          <td className="px-4 py-2 text-gray-500">{PAYMENT_METHODS.find(p => p.value === e.paymentMethod)?.label || e.paymentMethod}</td>
                          <td className={`px-4 py-2 text-right font-bold ${e.type === "entrada" ? "text-green-600" : "text-red-600"}`}>
                            {e.type === "entrada" ? "+" : "-"}{fmtCurrency(e.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* History */}
      {allDc.filter(d => d.date !== today || d.status === "fechado").length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Histórico de Fechamentos</h2>
          <div className="space-y-2">
            {allDc.filter(d => d.status === "fechado").map(dc => (
              <div key={dc.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-800">{dc.date}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Entradas: <span className="text-green-600 font-semibold">{fmtCurrency(dc.totalIn)}</span>
                    {" | "}Saídas: <span className="text-red-600 font-semibold">{fmtCurrency(dc.totalOut)}</span>
                    {" | "}Saldo: <span className="font-semibold">{fmtCurrency(dc.closingBalance)}</span>
                  </div>
                  {dc.reportedBalance != null && (
                    <div className="text-xs mt-0.5">
                      Diferença: <span className={`font-bold ${(dc.difference || 0) === 0 ? "text-green-600" : "text-orange-600"}`}>{fmtCurrency(dc.difference || 0)}</span>
                    </div>
                  )}
                </div>
                <button onClick={() => printClose(dc)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Close Modal */}
      {showCloseModal && todayDc && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Fechar Caixa</h2>
              <button onClick={() => setShowCloseModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Saldo Inicial:</span><span className="font-semibold">{fmtCurrency(todayDc.openingBalance)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Entradas:</span><span className="font-semibold text-green-600">{fmtCurrency(totalIn)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Saídas:</span><span className="font-semibold text-red-600">{fmtCurrency(totalOut)}</span></div>
              <div className="flex justify-between border-t pt-1.5"><span className="font-bold">Saldo Calculado:</span><span className="font-black">{fmtCurrency(projectedClosing)}</span></div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Saldo Contado Fisicamente (R$)</label>
                <input type="number" step="0.01" min="0" value={reportedBalance} onChange={e => setReportedBalance(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {reportedBalance && (
                  <div className={`text-xs mt-1 font-semibold ${Number(reportedBalance) === projectedClosing ? "text-green-600" : "text-orange-600"}`}>
                    Diferença: {fmtCurrency(Number(reportedBalance) - projectedClosing)}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Observações</label>
                <textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCloseModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleClose} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" /> Fechar Caixa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
