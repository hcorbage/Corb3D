import { useState, useEffect } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, DollarSign, Clock, CheckCircle, AlertCircle, BarChart2, Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix", dinheiro: "Dinheiro", credito: "Cartão de Crédito",
  debito: "Cartão de Débito", boleto: "Boleto", transferencia: "Transferência", outro: "Outro",
};

type Summary = {
  monthlyIn: number; monthlyOut: number; monthlyNet: number;
  todayIn: number; todayOut: number;
  ordersPending: number; ordersPartial: number; ordersPaid: number;
  byPayment: Record<string, number>;
  openDailyCash: any;
};

type MonthlyData = { month: string; entrada: number; saida: number };

export default function FinanceiroDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthlyChart, setMonthlyChart] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, entriesRes] = await Promise.all([
          fetch("/api/financial/summary").then(r => r.json()),
          fetch("/api/cash-entries").then(r => r.json()),
        ]);
        setSummary(sumRes);
        // Build last 6 months chart data
        const now = new Date();
        const months: MonthlyData[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = subMonths(now, i);
          const key = format(d, "yyyy-MM");
          const label = format(d, "MMM", { locale: ptBR });
          const monthEntries = (Array.isArray(entriesRes) ? entriesRes : []).filter(
            (e: any) => e.date.startsWith(key) && e.status !== "cancelado"
          );
          months.push({
            month: label.charAt(0).toUpperCase() + label.slice(1),
            entrada: monthEntries.filter((e: any) => e.type === "entrada").reduce((s: number, e: any) => s + e.amount, 0),
            saida: monthEntries.filter((e: any) => e.type === "saida").reduce((s: number, e: any) => s + e.amount, 0),
          });
        }
        setMonthlyChart(months);
      } catch {
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Carregando...</div>;

  const byPmEntries = Object.entries(summary?.byPayment || {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Financeiro</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
      </div>

      {/* Status Caixa Diário */}
      {summary?.openDailyCash && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="text-sm text-green-800">
            <strong>Caixa do dia aberto</strong> — saldo inicial: {formatCurrency(summary.openDailyCash.openingBalance)}
          </div>
        </div>
      )}

      {/* Resumo do Mês */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Mês Atual</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpCircle className="w-5 h-5 text-green-500" />
              <span className="text-xs font-bold text-gray-500 uppercase">Entradas</span>
            </div>
            <div className="text-2xl font-black text-green-600">{formatCurrency(summary?.monthlyIn || 0)}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownCircle className="w-5 h-5 text-red-500" />
              <span className="text-xs font-bold text-gray-500 uppercase">Saídas</span>
            </div>
            <div className="text-2xl font-black text-red-600">{formatCurrency(summary?.monthlyOut || 0)}</div>
          </div>
          <div className={`bg-white rounded-2xl p-5 border shadow-sm col-span-2 lg:col-span-1 ${(summary?.monthlyNet || 0) >= 0 ? "border-green-200" : "border-red-200"}`}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className={`w-5 h-5 ${(summary?.monthlyNet || 0) >= 0 ? "text-green-600" : "text-red-600"}`} />
              <span className="text-xs font-bold text-gray-500 uppercase">Saldo Líquido</span>
            </div>
            <div className={`text-2xl font-black ${(summary?.monthlyNet || 0) >= 0 ? "text-green-700" : "text-red-700"}`}>
              {formatCurrency(summary?.monthlyNet || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Resumo de Hoje */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Hoje — {format(new Date(), "dd/MM/yyyy")}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <div className="text-xs font-bold text-blue-500 uppercase mb-1">Entradas</div>
            <div className="text-xl font-black text-blue-700">{formatCurrency(summary?.todayIn || 0)}</div>
          </div>
          <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
            <div className="text-xs font-bold text-orange-500 uppercase mb-1">Saídas</div>
            <div className="text-xl font-black text-orange-700">{formatCurrency(summary?.todayOut || 0)}</div>
          </div>
        </div>
      </div>

      {/* Pedidos */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Pedidos Financeiros</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <div className="text-2xl font-black text-gray-900">{summary?.ordersPending || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Pendentes</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-gray-900">{summary?.ordersPartial || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Parciais</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-black text-gray-900">{summary?.ordersPaid || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Pagos</div>
          </div>
        </div>
      </div>

      {/* Gráfico Entradas x Saídas */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 mb-4">Últimos 6 Meses — Entradas x Saídas</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyChart} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} width={48} />
            <Tooltip formatter={(v: any) => formatCurrency(v)} labelStyle={{ fontWeight: "bold" }} />
            <Bar dataKey="entrada" name="Entradas" fill="#22c55e" radius={[4,4,0,0]} />
            <Bar dataKey="saida" name="Saídas" fill="#ef4444" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Por Forma de Pagamento */}
      {byPmEntries.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Entradas por Forma de Pagamento (mês atual)</h2>
          <div className="space-y-3">
            {byPmEntries.sort((a, b) => b[1] - a[1]).map(([key, val]) => {
              const max = Math.max(...byPmEntries.map(e => e[1]));
              const pct = max > 0 ? (val / max) * 100 : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-gray-600 text-right flex-shrink-0">{PAYMENT_LABELS[key] || key}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-28 text-sm font-bold text-gray-800 text-right">{formatCurrency(val)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
