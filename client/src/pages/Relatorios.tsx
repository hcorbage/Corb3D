import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Search, Download, Filter, TrendingUp, TrendingDown } from "lucide-react";

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const PAYMENT_METHODS: Record<string, string> = {
  pix: "Pix", dinheiro: "Dinheiro", credito: "Cartão de Crédito",
  debito: "Cartão de Débito", boleto: "Boleto", transferencia: "Transferência",
  entrada_50: "50% Entrada + 50% Entrega", outro: "Outro",
};

const CATEGORIES_ENTRADA = ["venda de pedido", "ajuste positivo", "outros recebimentos"];
const CATEGORIES_SAIDA = ["filamento", "frete", "embalagem", "energia", "manutenção", "ferramentas", "taxas", "ajuste negativo", "outras despesas"];

type CashEntry = {
  id: string; date: string; clientName: string; projectName: string;
  description: string; amount: number; paymentMethod: string;
  type: string; category: string; status: string; effectiveDate: string; notes: string;
};

export default function Relatorios() {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDateFrom, setFilterDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterDateTo, setFilterDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterType, setFilterType] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/cash-entries").then(r => r.json()).then(d => {
      setEntries(Array.isArray(d) ? d : []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = entries.filter(e => {
    if (filterDateFrom && e.date < filterDateFrom) return false;
    if (filterDateTo && e.date > filterDateTo) return false;
    if (filterType !== "all" && e.type !== filterType) return false;
    if (filterPayment !== "all" && e.paymentMethod !== filterPayment) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!e.clientName.toLowerCase().includes(s) && !e.projectName.toLowerCase().includes(s) && !e.description.toLowerCase().includes(s)) return false;
    }
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const totalIn = filtered.filter(e => e.type === "entrada" && e.status !== "cancelado").reduce((s, e) => s + e.amount, 0);
  const totalOut = filtered.filter(e => e.type === "saida" && e.status !== "cancelado").reduce((s, e) => s + e.amount, 0);
  const net = totalIn - totalOut;

  const byCategory: Record<string, { in: number; out: number }> = {};
  filtered.filter(e => e.status !== "cancelado").forEach(e => {
    const cat = e.category || "Sem categoria";
    if (!byCategory[cat]) byCategory[cat] = { in: 0, out: 0 };
    if (e.type === "entrada") byCategory[cat].in += e.amount;
    else byCategory[cat].out += e.amount;
  });

  const byPaymentIn: Record<string, number> = {};
  filtered.filter(e => e.type === "entrada" && e.status !== "cancelado").forEach(e => {
    byPaymentIn[e.paymentMethod] = (byPaymentIn[e.paymentMethod] || 0) + e.amount;
  });

  const printReport = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const period = `${filterDateFrom} → ${filterDateTo}`;
    const typeLbl = filterType === "all" ? "Todos" : filterType === "entrada" ? "Entradas" : "Saídas";
    win.document.write(`<html><head><title>Relatório Financeiro</title>
    <style>
      @page{size:A4;margin:15mm}body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:0}
      h1{font-size:18px;font-weight:bold;margin-bottom:2px}
      .meta{color:#555;font-size:10px;margin-bottom:14px}
      .summary{display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap}
      .scard{border:1px solid #ddd;border-radius:4px;padding:8px 12px;min-width:120px}
      .scard .lbl{font-size:9px;font-weight:bold;text-transform:uppercase;color:#555}
      .scard .val{font-size:15px;font-weight:bold;margin-top:2px}
      table{width:100%;border-collapse:collapse}
      th{background:#111;color:#fff;padding:5px 7px;font-size:10px;text-align:left}
      td{padding:4px 7px;border-bottom:1px solid #eee;font-size:10px}
      tr:nth-child(even) td{background:#f9f9f9}
      .in{color:#16a34a;font-weight:bold}.out{color:#dc2626;font-weight:bold}
      .tfoot td{background:#f0f9ff;font-weight:bold;border-top:2px solid #111}
      .footer{margin-top:16px;font-size:9px;color:#999;border-top:1px solid #ddd;padding-top:8px}
      button{position:fixed;top:12px;right:12px;padding:6px 16px;background:#111;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px}
      @media print{button{display:none}}
    </style></head><body>
    <button onclick="window.print()">🖨️ Salvar PDF</button>
    <h1>Relatório Financeiro — C3D Manager 1.0®</h1>
    <div class="meta">
      <div><strong>Período:</strong> ${period} | <strong>Tipo:</strong> ${typeLbl} | <strong>Gerado em:</strong> ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
    </div>
    <div class="summary">
      <div class="scard"><div class="lbl">Entradas</div><div class="val" style="color:#16a34a">${fmtCurrency(totalIn)}</div></div>
      <div class="scard"><div class="lbl">Saídas</div><div class="val" style="color:#dc2626">${fmtCurrency(totalOut)}</div></div>
      <div class="scard"><div class="lbl">Saldo Líquido</div><div class="val" style="color:${net>=0?"#16a34a":"#dc2626"}">${fmtCurrency(net)}</div></div>
      <div class="scard"><div class="lbl">Lançamentos</div><div class="val">${filtered.length}</div></div>
    </div>
    <table>
      <thead><tr>
        <th>Data</th><th>Cliente</th><th>Projeto / Descrição</th><th>Categoria</th><th>Pagamento</th><th>Status</th><th>Tipo</th><th style="text-align:right">Valor</th>
      </tr></thead>
      <tbody>
        ${filtered.map(e => `<tr>
          <td>${e.date}</td>
          <td>${e.clientName||"—"}</td>
          <td>${e.projectName||e.description||"—"}</td>
          <td>${e.category||"—"}</td>
          <td>${PAYMENT_METHODS[e.paymentMethod]||e.paymentMethod}</td>
          <td>${e.status}</td>
          <td class="${e.type==="entrada"?"in":"out"}">${e.type==="entrada"?"Entrada":"Saída"}</td>
          <td style="text-align:right" class="${e.type==="entrada"?"in":"out"}">${e.type==="entrada"?"+":"-"}${fmtCurrency(e.amount)}</td>
        </tr>`).join("")}
        <tr class="tfoot">
          <td colspan="7">TOTAL</td>
          <td style="text-align:right">${fmtCurrency(totalIn - totalOut)}</td>
        </tr>
      </tbody>
    </table>
    <div class="footer">C3D Manager 1.0® — ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
    </body></html>`);
    win.document.close();
  };

  const allCategories = [...new Set(entries.map(e => e.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Exportação e análise financeira</p>
          </div>
        </div>
        <button onClick={printReport} disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-xl text-sm font-semibold hover:bg-gray-900 transition-colors shadow-sm disabled:opacity-40">
          <Download className="w-4 h-4" /> Exportar PDF
        </button>
      </div>

      {/* Quick Periods */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Hoje", from: format(new Date(), "yyyy-MM-dd"), to: format(new Date(), "yyyy-MM-dd") },
          { label: "Este mês", from: format(startOfMonth(new Date()), "yyyy-MM-dd"), to: format(endOfMonth(new Date()), "yyyy-MM-dd") },
          { label: "Mês anterior", from: format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"), to: format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd") },
          { label: "Últimos 3 meses", from: format(startOfMonth(subMonths(new Date(), 2)), "yyyy-MM-dd"), to: format(endOfMonth(new Date()), "yyyy-MM-dd") },
        ].map(p => (
          <button key={p.label} onClick={() => { setFilterDateFrom(p.from); setFilterDateTo(p.to); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              filterDateFrom === p.from && filterDateTo === p.to
                ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-bold text-gray-700">Filtros</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">DE</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">ATÉ</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">TIPO</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="all">Todos</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">PAGAMENTO</label>
            <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="all">Todos</option>
              {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">STATUS</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="all">Todos</option>
              <option value="realizado">Realizado</option>
              <option value="previsto">Previsto</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">CATEGORIA</label>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="all">Todas</option>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs font-bold text-gray-500">Entradas</span>
          </div>
          <div className="text-xl font-black text-green-600">{fmtCurrency(totalIn)}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold text-gray-500">Saídas</span>
          </div>
          <div className="text-xl font-black text-red-600">{fmtCurrency(totalOut)}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs font-bold text-gray-500 mb-1">Saldo Líquido</div>
          <div className={`text-xl font-black ${net >= 0 ? "text-green-700" : "text-red-700"}`}>{fmtCurrency(net)}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs font-bold text-gray-500 mb-1">Lançamentos</div>
          <div className="text-xl font-black text-gray-800">{filtered.length}</div>
        </div>
      </div>

      {/* By Category */}
      {Object.keys(byCategory).length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Por Categoria</h3>
          <div className="space-y-2">
            {Object.entries(byCategory).sort((a, b) => (b[1].in + b[1].out) - (a[1].in + a[1].out)).map(([cat, vals]) => (
              <div key={cat} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-600 capitalize">{cat}</span>
                <div className="flex gap-4">
                  {vals.in > 0 && <span className="text-green-700 font-semibold">+{fmtCurrency(vals.in)}</span>}
                  {vals.out > 0 && <span className="text-red-700 font-semibold">-{fmtCurrency(vals.out)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum lançamento encontrado para os filtros selecionados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">Cliente / Projeto</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">Pagamento</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">Tipo</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(e => (
                  <tr key={e.id} className={`hover:bg-gray-50/50 ${e.status === "cancelado" ? "opacity-50" : ""}`}>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{e.date}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-gray-800">{e.clientName || "—"}</div>
                      {e.projectName && <div className="text-xs text-muted-foreground">{e.projectName}</div>}
                      {!e.clientName && e.description && <div className="text-xs text-muted-foreground">{e.description}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 capitalize">{e.category || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-500">{PAYMENT_METHODS[e.paymentMethod] || e.paymentMethod}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        e.status === "realizado" ? "bg-green-100 text-green-700" :
                        e.status === "previsto" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-500"}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${e.type === "entrada" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {e.type === "entrada" ? "Entrada" : "Saída"}
                      </span>
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold whitespace-nowrap ${e.type === "entrada" ? "text-green-600" : "text-red-600"}`}>
                      {e.type === "entrada" ? "+" : "-"}{fmtCurrency(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={6} className="px-4 py-3 text-sm font-bold text-gray-700">Total ({filtered.length})</td>
                  <td className={`px-4 py-3 text-right text-base font-black ${net >= 0 ? "text-green-700" : "text-red-700"}`}>{fmtCurrency(net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
