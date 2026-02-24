import { useState, useMemo } from "react";
import { useAppState, Calculation, Employee } from "../context/AppState";
import { useAuth } from "../context/AuthContext";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Users, TrendingUp, Calendar, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Commissions() {
  const { history, employees } = useAppState();
  const { isAdmin, id: currentUserId } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>("all");
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const currentEmployee = useMemo(() => {
    if (isAdmin) return null;
    return employees.find(e => e.linkedUserId === currentUserId) || null;
  }, [isAdmin, employees, currentUserId]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    const now = new Date();
    months.add(format(now, 'yyyy-MM'));
    history.forEach(calc => {
      if (calc.date) {
        try {
          months.add(format(parseISO(calc.date), 'yyyy-MM'));
        } catch {}
      }
    });
    return Array.from(months).sort().reverse();
  }, [history]);

  const filteredSales = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    return history.filter(calc => {
      if (!calc.date) return false;
      if (calc.status !== 'confirmed') return false;
      try {
        const calcDate = parseISO(calc.date);
        return isWithinInterval(calcDate, { start: monthStart, end: monthEnd });
      } catch {
        return false;
      }
    });
  }, [history, selectedMonth]);

  const employeeCommissions = useMemo(() => {
    const commissionMap = new Map<string, {
      employee: Employee | null;
      employeeName: string;
      sales: Calculation[];
      totalSales: number;
      commissionRate: number;
      totalCommission: number;
    }>();

    filteredSales.forEach(sale => {
      const empId = sale.employeeId || '__none__';
      const empName = sale.employeeName || 'Sem Vendedor';
      
      if (!commissionMap.has(empId)) {
        const emp = employees.find(e => e.id === empId) || null;
        commissionMap.set(empId, {
          employee: emp,
          employeeName: emp?.name || empName,
          sales: [],
          totalSales: 0,
          commissionRate: emp?.commissionRate || 0,
          totalCommission: 0,
        });
      }

      const data = commissionMap.get(empId)!;
      data.sales.push(sale);
      data.totalSales += sale.suggestedPrice;
      data.commissionRate = data.employee?.commissionRate || 0;
      data.totalCommission = data.totalSales * (data.commissionRate / 100);
    });

    let result = Array.from(commissionMap.values());

    if (!isAdmin) {
      if (currentEmployee) {
        result = result.filter(r => r.employee?.id === currentEmployee.id);
      } else {
        result = [];
      }
    }
    
    if (isAdmin && selectedEmployeeFilter !== "all") {
      result = result.filter(r => (r.employee?.id || '__none__') === selectedEmployeeFilter);
    }

    return result.sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredSales, employees, selectedEmployeeFilter, isAdmin, currentEmployee]);

  const totals = useMemo(() => {
    return employeeCommissions.reduce(
      (acc, ec) => ({
        totalSales: acc.totalSales + ec.totalSales,
        totalCommission: acc.totalCommission + ec.totalCommission,
        totalOrders: acc.totalOrders + ec.sales.length,
      }),
      { totalSales: 0, totalCommission: 0, totalOrders: 0 }
    );
  }, [employeeCommissions]);

  const [year, month] = selectedMonth.split('-').map(Number);
  const monthLabel = format(new Date(year, month - 1), "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 data-testid="text-commissions-title" className="text-3xl font-display font-bold">
            {isAdmin ? 'Comissões' : 'Minhas Comissões'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin 
              ? 'Relatório de vendas e comissões por funcionário.' 
              : currentEmployee 
                ? `Suas vendas e comissões - ${currentEmployee.name}`
                : 'Suas vendas e comissões.'
            }
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 bg-card p-2 rounded-xl border border-border shadow-sm">
            <Calendar className="w-4 h-4 text-muted-foreground ml-2" />
            <select
              data-testid="select-commission-month"
              className="bg-transparent border-none text-sm focus:outline-none pr-2 capitalize"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {availableMonths.map(m => {
                const [y, mo] = m.split('-').map(Number);
                return (
                  <option key={m} value={m}>
                    {format(new Date(y, mo - 1), "MMMM yyyy", { locale: ptBR })}
                  </option>
                );
              })}
            </select>
          </div>

          {isAdmin && employees.length > 0 && (
            <div className="flex items-center gap-2 bg-card p-2 rounded-xl border border-border shadow-sm">
              <Search className="w-4 h-4 text-muted-foreground ml-2" />
              <Select value={selectedEmployeeFilter} onValueChange={setSelectedEmployeeFilter}>
                <SelectTrigger className="w-full sm:w-[200px] border-none shadow-none focus:ring-0">
                  <SelectValue placeholder="Filtrar vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vendedores</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-3'} gap-4`}>
        <div className="bg-card rounded-2xl border border-card-border shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Vendas do Mês</p>
            <p data-testid="text-total-orders" className="text-2xl font-bold">{totals.totalOrders}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-card-border shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Faturado</p>
            <p data-testid="text-total-sales" className="text-2xl font-bold font-mono">{formatCurrency(totals.totalSales)}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-card-border shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
            <Users className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              {isAdmin ? 'Total Comissões' : 'Minha Comissão'}
            </p>
            <p data-testid="text-total-commissions" className="text-2xl font-bold font-mono text-amber-600">{formatCurrency(totals.totalCommission)}</p>
          </div>
        </div>
      </div>

      {employeeCommissions.length === 0 ? (
        <div className="bg-card rounded-2xl border border-card-border shadow-sm overflow-hidden p-12 flex flex-col items-center justify-center text-muted-foreground">
          <Users className="w-12 h-12 mb-3 opacity-20" />
          <p>Nenhuma venda confirmada encontrada para {monthLabel}.</p>
          <p className="text-sm mt-1">Apenas orçamentos com status "Autorizado" são contabilizados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {employeeCommissions.map((ec) => {
            const empId = ec.employee?.id || '__none__';
            const isExpanded = expandedEmployee === empId;

            return (
              <div key={empId} className="bg-card rounded-2xl border border-card-border shadow-sm overflow-hidden">
                <button
                  data-testid={`button-expand-employee-${empId}`}
                  onClick={() => setExpandedEmployee(isExpanded ? null : empId)}
                  className="w-full px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-secondary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                      {ec.employeeName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-foreground">{ec.employeeName}</h2>
                      <p className="text-sm text-muted-foreground">
                        {ec.sales.length} {ec.sales.length === 1 ? 'venda' : 'vendas'}
                        {isAdmin ? ` • Comissão: ${ec.commissionRate}%` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Faturamento</p>
                      <p className="font-mono font-bold text-lg">{formatCurrency(ec.totalSales)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Comissão</p>
                      <p className="font-mono font-bold text-lg text-amber-600">{formatCurrency(ec.totalCommission)}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border/50">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-secondary/10 border-b border-border/50">
                          <tr>
                            <th className="px-3 sm:px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs whitespace-nowrap">Data</th>
                            <th className="px-3 sm:px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Cliente</th>
                            <th className="px-3 sm:px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Projeto</th>
                            {isAdmin && <th className="px-3 sm:px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs whitespace-nowrap">Vendedor</th>}
                            <th className="px-3 sm:px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs text-right whitespace-nowrap">Valor</th>
                            <th className="px-3 sm:px-6 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs text-right whitespace-nowrap">Comissão</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {ec.sales.map((sale) => {
                            const saleCommission = sale.suggestedPrice * (ec.commissionRate / 100);
                            return (
                              <tr key={sale.id} className="hover:bg-secondary/5 transition-colors">
                                <td className="px-3 sm:px-6 py-4 text-muted-foreground whitespace-nowrap text-xs sm:text-sm">
                                  {format(parseISO(sale.date), "dd/MM/yy")}
                                </td>
                                <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm truncate max-w-[120px]">{sale.clientName}</td>
                                <td className="px-3 sm:px-6 py-4 font-medium text-foreground text-xs sm:text-sm truncate max-w-[120px]">{sale.projectName}</td>
                                {isAdmin && (
                                  <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm whitespace-nowrap">{sale.employeeName || 'Sem Vendedor'}</td>
                                )}
                                <td className="px-3 sm:px-6 py-4 font-mono text-right whitespace-nowrap text-xs sm:text-sm">
                                  {formatCurrency(sale.suggestedPrice)}
                                </td>
                                <td className="px-3 sm:px-6 py-4 font-mono font-bold text-amber-600 text-right whitespace-nowrap text-xs sm:text-sm">
                                  {formatCurrency(saleCommission)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-secondary/10 border-t border-border/50">
                          <tr>
                            <td colSpan={isAdmin ? 4 : 3} className="px-3 sm:px-6 py-3 font-semibold text-sm uppercase tracking-wider">Total</td>
                            <td className="px-3 sm:px-6 py-3 font-mono font-bold text-right text-sm">{formatCurrency(ec.totalSales)}</td>
                            <td className="px-3 sm:px-6 py-3 font-mono font-bold text-amber-600 text-right text-sm">{formatCurrency(ec.totalCommission)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
