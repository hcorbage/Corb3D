import { useState } from "react";
import { useLocation } from "wouter";
import { useAppState, Calculation } from "../context/AppState";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Edit2, Trash2, Clock, XCircle, Check, Search, Eye, MoreHorizontal, Activity } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleStatusChange = (calc: Calculation, newStatus: 'pending' | 'confirmed' | 'denied') => {
    updateCalculation({ ...calc, status: newStatus });
    
    let statusText = "Aguardando";
    if (newStatus === 'confirmed') statusText = "Autorizado";
    if (newStatus === 'denied') statusText = "Não Autorizado";
    
    toast({ title: "Status Atualizado", description: `Orçamento marcado como ${statusText}.` });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja apagar este orçamento?')) {
      deleteCalculation(id);
      toast({ title: "Sucesso", description: "Orçamento apagado com sucesso." });
    }
  };

  const [, setLocation] = useLocation();

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

  // Get unique clients for filter
  const uniqueClients = Array.from(new Set(history.map(c => c.clientName || 'Cliente Não Identificado'))).sort();

  // Filter history
  const filteredHistory = selectedClientFilter === "all" 
    ? history 
    : history.filter(calc => (calc.clientName || 'Cliente Não Identificado') === selectedClientFilter);

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

      {Object.keys(groupedHistory).length === 0 ? (
        <div className="bg-card rounded-2xl border border-card-border shadow-sm overflow-hidden p-12 flex flex-col items-center justify-center text-muted-foreground">
          <FileText className="w-12 h-12 mb-3 opacity-20" />
          <p>{history.length === 0 ? "Nenhum orçamento salvo no histórico." : "Nenhum orçamento encontrado para este cliente."}</p>
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
                                
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openViewModal(calc); }} className="text-muted-foreground hover:text-primary hover:bg-primary/10 p-2 rounded-lg transition-all border border-transparent hover:border-primary/20 cursor-pointer" title="Visualizar Orçamento Completo">
                                  <Eye className="w-4 h-4 pointer-events-none" />
                                </button>
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
    </div>
  );
}