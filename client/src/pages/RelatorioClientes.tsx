import { useState, useEffect } from "react";
import { Users, TrendingUp, AlertCircle, Clock, CheckCircle, DollarSign, Download, Search, Filter, ChevronDown, ChevronUp, BarChart3, Award } from "lucide-react";

type ClientFinancialSummary = {
  clientName: string;
  qtdPedidos: number;
  totalComprado: number;
  totalPago: number;
  totalPendente: number;
  aFaturar: number;
  pendenteNaoFaturar: number;
  temVencido: boolean;
  ultimoPedido: string;
};

type StatusKey = "todos" | "em_dia" | "a_faturar" | "pendente" | "inadimplente";

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function getFinancialStatus(s: ClientFinancialSummary): { key: StatusKey; label: string; color: string; bg: string; icon: any } {
  if (s.temVencido) return { key: "inadimplente", label: "Inadimplente", color: "text-red-700", bg: "bg-red-100", icon: AlertCircle };
  if (s.pendenteNaoFaturar > 0) return { key: "pendente", label: "Pendente", color: "text-yellow-700", bg: "bg-yellow-100", icon: Clock };
  if (s.aFaturar > 0) return { key: "a_faturar", label: "A Faturar", color: "text-purple-700", bg: "bg-purple-100", icon: Clock };
  if (s.totalPendente === 0 && s.totalComprado > 0) return { key: "em_dia", label: "Em dia", color: "text-green-700", bg: "bg-green-100", icon: CheckCircle };
  return { key: "em_dia", label: "Sem pedidos", color: "text-gray-500", bg: "bg-gray-100", icon: CheckCircle };
}

export default function RelatorioClientes() {
  const [data, setData] = useState<ClientFinancialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusKey>("todos");
  const [sortBy, setSortBy] = useState<"totalComprado" | "totalPendente" | "qtdPedidos" | "clientName">("totalComprado");
  const [sortAsc, setSortAsc] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/client-financials");
      const json = await res.json();
      if (Array.isArray(json)) setData(json);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = data
    .filter(d => {
      if (search && !d.clientName.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== "todos") {
        const st = getFinancialStatus(d);
        if (st.key !== filterStatus) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const va = a[sortBy] as any;
      const vb = b[sortBy] as any;
      if (typeof va === "string") return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(false); }
  };

  const totals = {
    clientes: data.length,
    totalComprado: data.reduce((s, d) => s + d.totalComprado, 0),
    totalPago: data.reduce((s, d) => s + d.totalPago, 0),
    totalPendente: data.reduce((s, d) => s + d.totalPendente, 0),
    inadimplentes: data.filter(d => d.temVencido).length,
    pendentes: data.filter(d => !d.temVencido && d.pendenteNaoFaturar > 0).length,
  };

  const handlePrint = () => {
    const today = new Date().toLocaleDateString("pt-BR");
    const rows = filtered.map(d => {
      const st = getFinancialStatus(d);
      return `<tr>
        <td>${d.clientName}</td>
        <td style="text-align:center">${d.qtdPedidos}</td>
        <td style="text-align:right">${fmtCurrency(d.totalComprado)}</td>
        <td style="text-align:right">${fmtCurrency(d.totalPago)}</td>
        <td style="text-align:right;${d.pendenteNaoFaturar > 0 ? 'color:#d97706' : ''}">${fmtCurrency(d.pendenteNaoFaturar)}</td>
        <td style="text-align:right;${d.aFaturar > 0 ? 'color:#7c3aed' : ''}">${fmtCurrency(d.aFaturar)}</td>
        <td style="text-align:center"><span style="background:${d.temVencido ? '#fee2e2' : d.pendenteNaoFaturar > 0 ? '#fef9c3' : '#dcfce7'};color:${d.temVencido ? '#b91c1c' : d.pendenteNaoFaturar > 0 ? '#a16207' : '#15803d'};padding:2px 8px;border-radius:999px;font-size:11px">${st.label}</span></td>
      </tr>`;
    }).join("");
    const win = window.open("", "_blank");
    win!.document.write(`<html><head><title>Relatório por Cliente — ${today}</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;margin:24px}h1{font-size:18px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#f3f4f6;padding:8px;text-align:left;font-size:11px;text-transform:uppercase;border-bottom:2px solid #e5e7eb}td{padding:8px;border-bottom:1px solid #f3f4f6}tr:hover td{background:#f9fafb}.summary{display:flex;gap:24px;margin:12px 0;padding:12px;background:#f9fafb;border-radius:8px}.summary div{text-align:center}.summary .label{font-size:10px;color:#6b7280;text-transform:uppercase}.summary .val{font-size:16px;font-weight:bold;color:#111}</style>
    </head><body>
      <h1>Relatório por Cliente</h1><p style="color:#6b7280">Gerado em ${today}</p>
      <div class="summary">
        <div><div class="label">Clientes</div><div class="val">${totals.clientes}</div></div>
        <div><div class="label">Total Comprado</div><div class="val">${fmtCurrency(totals.totalComprado)}</div></div>
        <div><div class="label">Total Pago</div><div class="val" style="color:#15803d">${fmtCurrency(totals.totalPago)}</div></div>
        <div><div class="label">Pendente</div><div class="val" style="color:#d97706">${fmtCurrency(totals.totalPendente)}</div></div>
      </div>
      <table><thead><tr><th>Cliente</th><th>Pedidos</th><th>Total Comprado</th><th>Total Pago</th><th>Pendente</th><th>A Faturar</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </body></html>`);
    win!.document.close();
    win!.print();
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) => (
    sortBy === col
      ? (sortAsc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />)
      : null
  );

  const STATUS_FILTERS: { key: StatusKey; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "em_dia", label: "Em dia" },
    { key: "a_faturar", label: "A Faturar" },
    { key: "pendente", label: "Pendente" },
    { key: "inadimplente", label: "Inadimplente" },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            Relatório por Cliente
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Visão financeira consolidada por cliente.</p>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-xl transition-colors font-medium text-sm">
          <Download className="w-4 h-4" />
          Exportar PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl border border-card-border p-4 shadow-sm">
          <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Clientes</div>
          <div className="text-2xl font-black text-gray-800">{totals.clientes}</div>
          <div className="text-xs text-muted-foreground mt-0.5">com pedidos</div>
        </div>
        <div className="bg-card rounded-2xl border border-card-border p-4 shadow-sm">
          <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Total Comprado</div>
          <div className="text-lg font-black text-blue-800">{fmtCurrency(totals.totalComprado)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">todos os pedidos</div>
        </div>
        <div className="bg-card rounded-2xl border border-card-border p-4 shadow-sm">
          <div className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Total Pago</div>
          <div className="text-lg font-black text-green-800">{fmtCurrency(totals.totalPago)}</div>
          {totals.totalComprado > 0 && (
            <div className="text-xs text-green-600 mt-0.5">{Math.round((totals.totalPago / totals.totalComprado) * 100)}% do total</div>
          )}
        </div>
        <div className="bg-card rounded-2xl border border-card-border p-4 shadow-sm">
          <div className="text-xs text-red-600 font-semibold uppercase tracking-wide mb-1">Pendente</div>
          <div className="text-lg font-black text-red-800">{fmtCurrency(totals.totalPendente)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{totals.inadimplentes} inadimplente{totals.inadimplentes !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 bg-card border border-card-border rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${filterStatus === f.key ? 'bg-primary text-primary-foreground' : 'bg-card border border-card-border hover:bg-gray-50'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ranking / Table */}
      {loading ? (
        <div className="bg-card rounded-2xl border border-card-border p-12 text-center text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-card-border p-12 text-center text-muted-foreground">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          Nenhum cliente encontrado com pedidos financeiros.
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-card-border shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/60">
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700" onClick={() => toggleSort("clientName")}>
                    Cliente <SortIcon col="clientName" />
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700" onClick={() => toggleSort("qtdPedidos")}>
                    Pedidos <SortIcon col="qtdPedidos" />
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700" onClick={() => toggleSort("totalComprado")}>
                    Total Comprado <SortIcon col="totalComprado" />
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Total Pago</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700" onClick={() => toggleSort("totalPendente")}>
                    Pendente <SortIcon col="totalPendente" />
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">A Faturar</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => {
                  const st = getFinancialStatus(d);
                  return (
                    <tr key={d.clientName} className="border-b border-border/50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {i < 3 && (
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-700'}`}>
                              {i + 1}
                            </span>
                          )}
                          <span className="font-semibold text-gray-800 text-sm">{d.clientName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm text-gray-600">{d.qtdPedidos}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-blue-700 text-sm">{fmtCurrency(d.totalComprado)}</td>
                      <td className="px-4 py-3.5 text-right text-green-700 text-sm">{fmtCurrency(d.totalPago)}</td>
                      <td className="px-4 py-3.5 text-right text-sm">
                        {d.pendenteNaoFaturar > 0
                          ? <span className="font-semibold text-yellow-700">{fmtCurrency(d.pendenteNaoFaturar)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm">
                        {d.aFaturar > 0
                          ? <span className={`font-semibold ${d.temVencido ? 'text-red-700' : 'text-purple-700'}`}>{fmtCurrency(d.aFaturar)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${st.bg} ${st.color}`}>
                          <st.icon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-5 py-3 text-xs font-bold text-gray-600 uppercase">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</td>
                  <td className="px-4 py-3 text-center text-xs font-bold text-gray-600">{filtered.reduce((s, d) => s + d.qtdPedidos, 0)}</td>
                  <td className="px-4 py-3 text-right text-sm font-black text-blue-800">{fmtCurrency(filtered.reduce((s, d) => s + d.totalComprado, 0))}</td>
                  <td className="px-4 py-3 text-right text-sm font-black text-green-800">{fmtCurrency(filtered.reduce((s, d) => s + d.totalPago, 0))}</td>
                  <td className="px-4 py-3 text-right text-sm font-black text-yellow-800">{fmtCurrency(filtered.reduce((s, d) => s + d.pendenteNaoFaturar, 0))}</td>
                  <td className="px-4 py-3 text-right text-sm font-black text-purple-800">{fmtCurrency(filtered.reduce((s, d) => s + d.aFaturar, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border">
            {filtered.map((d, i) => {
              const st = getFinancialStatus(d);
              const isExp = expanded === d.clientName;
              return (
                <div key={d.clientName} className="p-4">
                  <button
                    className="w-full flex items-center justify-between"
                    onClick={() => setExpanded(isExp ? null : d.clientName)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {i < 3 && (
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-700'}`}>
                          {i + 1}
                        </span>
                      )}
                      <span className="font-bold text-gray-800 truncate">{d.clientName}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${st.bg} ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-sm font-black text-blue-700">{fmtCurrency(d.totalComprado)}</span>
                      {isExp ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {isExp && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="bg-blue-50 rounded-xl p-3 text-center">
                        <div className="text-[10px] text-blue-600 font-semibold">Total Comprado</div>
                        <div className="text-sm font-black text-blue-800">{fmtCurrency(d.totalComprado)}</div>
                        <div className="text-[10px] text-blue-500">{d.qtdPedidos} pedido{d.qtdPedidos !== 1 ? 's' : ''}</div>
                      </div>
                      <div className="bg-green-50 rounded-xl p-3 text-center">
                        <div className="text-[10px] text-green-600 font-semibold">Total Pago</div>
                        <div className="text-sm font-black text-green-800">{fmtCurrency(d.totalPago)}</div>
                      </div>
                      {d.pendenteNaoFaturar > 0 && (
                        <div className="bg-yellow-50 rounded-xl p-3 text-center">
                          <div className="text-[10px] text-yellow-700 font-semibold">Pendente</div>
                          <div className="text-sm font-black text-yellow-800">{fmtCurrency(d.pendenteNaoFaturar)}</div>
                        </div>
                      )}
                      {d.aFaturar > 0 && (
                        <div className={`rounded-xl p-3 text-center ${d.temVencido ? 'bg-red-50' : 'bg-purple-50'}`}>
                          <div className={`text-[10px] font-semibold ${d.temVencido ? 'text-red-700' : 'text-purple-700'}`}>
                            {d.temVencido ? 'Vencido' : 'A Faturar'}
                          </div>
                          <div className={`text-sm font-black ${d.temVencido ? 'text-red-800' : 'text-purple-800'}`}>{fmtCurrency(d.aFaturar)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ranking highlight */}
      {filtered.length >= 3 && (
        <div className="bg-card rounded-2xl border border-card-border p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-yellow-500" />
            Top 3 Clientes por Volume
          </h3>
          <div className="flex gap-3 flex-wrap">
            {filtered.slice(0, 3).map((d, i) => (
              <div key={d.clientName} className={`flex-1 min-w-[140px] rounded-xl p-3 border ${i === 0 ? 'border-yellow-200 bg-yellow-50' : i === 1 ? 'border-gray-200 bg-gray-50' : 'border-orange-200 bg-orange-50'}`}>
                <div className={`text-xs font-bold mb-1 ${i === 0 ? 'text-yellow-700' : i === 1 ? 'text-gray-600' : 'text-orange-700'}`}>
                  {i === 0 ? '🥇 1º lugar' : i === 1 ? '🥈 2º lugar' : '🥉 3º lugar'}
                </div>
                <div className="font-bold text-gray-800 text-sm truncate">{d.clientName}</div>
                <div className="text-xs text-gray-600 mt-0.5">{fmtCurrency(d.totalComprado)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
