import { useState, useEffect, useCallback } from "react";
import { useAppState, StockItem } from "../context/AppState";
import {
  PackagePlus, Trash2, Edit2, Check, X, ArrowUpDown, Plus,
  TrendingUp, TrendingDown, RefreshCw, History, AlertTriangle, AlertCircle,
  Package, ChevronDown, ChevronUp, Layers
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SortField = "brand" | "color" | null;
type SortDirection = "asc" | "desc";
type MovementType = "entrada" | "saida" | "ajuste";

type StockMovement = {
  id: string;
  stockItemId: string;
  type: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  date: string;
  notes: string;
  triggeredBy: string;
  calculationId?: string;
  createdAt: string;
};

const CASH_CATEGORIES = [
  "Matéria-prima / Insumos",
  "Embalagens",
  "Resinas",
  "Filamentos",
  "Consumíveis",
  "Outros",
];

const today = () => new Date().toISOString().slice(0, 10);

function formatQty(q: number) {
  return q >= 1000 ? `${(q / 1000).toFixed(2)} Kg` : `${q.toFixed(0)} g`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function StockBadge({ quantity, minQuantity }: { quantity: number; minQuantity: number }) {
  if (quantity <= 0)
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700"><AlertCircle className="w-3 h-3" />Zerado</span>;
  if (quantity <= minQuantity)
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700"><AlertTriangle className="w-3 h-3" />Baixo</span>;
  return null;
}

function MovementModal({
  item,
  materialName,
  onClose,
  onSaved,
}: {
  item: StockItem;
  materialName: string;
  onClose: () => void;
  onSaved: (updatedItem: StockItem) => void;
}) {
  const { toast } = useToast();
  const [type, setType] = useState<MovementType>("entrada");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [cashEntry, setCashEntry] = useState(false);
  const [purchaseValue, setPurchaseValue] = useState("");
  const [cashCategory, setCashCategory] = useState(CASH_CATEGORIES[0]);
  const [showCashClosedConfirm, setShowCashClosedConfirm] = useState(false);

  const submitMovement = async (withCashEntry: boolean, forceCashClosed = false) => {
    const qty = Number(quantity);
    setLoading(true);
    try {
      const res = await fetch("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockItemId: item.id,
          type,
          quantity: qty,
          date,
          notes,
          triggeredBy: "manual",
          generateCashEntry: withCashEntry && cashEntry && type === "entrada",
          purchaseValue: cashEntry ? Number(purchaseValue) : 0,
          cashCategory,
          cashWasClosed: forceCashClosed,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.cashClosed) {
        setShowCashClosedConfirm(true);
        return;
      }
      if (!res.ok) throw new Error(data.message);
      const { stockItem } = data;
      onSaved(stockItem);
      const typeLabel = type === "entrada" ? "Entrada" : type === "saida" ? "Saída" : "Ajuste";
      if (forceCashClosed) {
        toast({ title: `${typeLabel} registrada — caixa fechado`, description: `Estoque atualizado, mas o lançamento financeiro não foi registrado no Livro Caixa.`, variant: "destructive" });
      } else {
        toast({ title: `${typeLabel} registrada`, description: `${formatQty(qty)} ${type === "entrada" ? "adicionado(s) ao" : type === "saida" ? "removido(s) do" : "ajustado(s) no"} estoque.` });
      }
      onClose();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Erro ao registrar movimentação.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toast({ title: "Erro", description: "Informe uma quantidade válida.", variant: "destructive" });
      return;
    }
    if (type === "saida" && qty > item.quantity) {
      toast({ title: "Erro", description: `Quantidade maior que o estoque disponível (${formatQty(item.quantity)}).`, variant: "destructive" });
      return;
    }
    await submitMovement(true);
  };

  const typeConfig: Record<MovementType, { label: string; icon: any; color: string; bg: string }> = {
    entrada: { label: "Entrada", icon: TrendingUp, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
    saida: { label: "Saída", icon: TrendingDown, color: "text-red-700", bg: "bg-red-50 border-red-200" },
    ajuste: { label: "Ajuste", icon: RefreshCw, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md border border-card-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-base">Movimentação de Estoque</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{materialName} — {item.brand} ({item.color})</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            {(["entrada", "saida", "ajuste"] as MovementType[]).map((t) => {
              const cfg = typeConfig[t];
              const Icon = cfg.icon;
              const active = type === t;
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${active ? `${cfg.bg} ${cfg.color} border-current shadow-sm` : "border-border text-muted-foreground hover:bg-secondary/50"}`}
                  data-testid={`button-movement-type-${t}`}
                >
                  <Icon className="w-4 h-4" />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {type === "ajuste" && (
            <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              Ajuste define a quantidade exata do estoque (ex: contagem física).
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">
                {type === "ajuste" ? "Nova quantidade (g)" : "Quantidade (g)"}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ex: 500"
                data-testid="input-movement-quantity"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Data</label>
              <input
                type="date"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                data-testid="input-movement-date"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">
              {type === "entrada" ? "Fornecedor / Observação" : "Motivo / Observação"}
            </label>
            <textarea
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={type === "entrada" ? "Ex: Compra fornecedor XYZ" : type === "saida" ? "Ex: Descarte / Perda / Uso interno" : "Ex: Contagem física"}
              data-testid="input-movement-notes"
            />
          </div>

          {type === "entrada" && (
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-secondary/50 transition-colors"
                onClick={() => setCashEntry((v) => !v)}
                data-testid="button-toggle-cash-entry"
              >
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  Registrar no Livro Caixa
                </span>
                {cashEntry ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {cashEntry && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border bg-secondary/10">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Valor da compra (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                      value={purchaseValue}
                      onChange={(e) => setPurchaseValue(e.target.value)}
                      placeholder="0,00"
                      data-testid="input-purchase-value"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Categoria</label>
                    <select
                      className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                      value={cashCategory}
                      onChange={(e) => setCashCategory(e.target.value)}
                      data-testid="select-cash-category"
                    >
                      {CASH_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-1 flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm hover:bg-secondary/50 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              data-testid="button-confirm-movement"
            >
              {loading ? "Salvando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>

      {showCashClosedConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-sm">Caixa de hoje está fechado</h3>
                <p className="text-amber-800 text-xs mt-0.5">Não é possível registrar lançamentos financeiros.</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm font-medium text-gray-800">O que acontece se você prosseguir:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                  <span className="text-gray-700">A quantidade em estoque <strong>será atualizada</strong></span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-red-500 font-bold shrink-0 mt-0.5">✗</span>
                  <span className="text-gray-700">
                    O valor de{" "}
                    <strong className="text-red-700">
                      {cashEntry && purchaseValue && Number(purchaseValue) > 0
                        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(purchaseValue))
                        : "compra"}
                    </strong>{" "}
                    <strong>NÃO será registrado</strong> no Livro Caixa
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500 font-bold shrink-0 mt-0.5">i</span>
                  <span className="text-gray-600">A decisão ficará registrada no histórico de movimentações com data, hora e usuário responsável</span>
                </div>
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                Para registrar o valor financeiro, reabra o caixa antes de lançar a entrada de material.
              </p>
            </div>
            <div className="px-5 pb-5 space-y-2">
              <button
                onClick={() => setShowCashClosedConfirm(false)}
                className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
                data-testid="button-cancel-cash-closed"
              >
                Cancelar — não fazer nada
              </button>
              <button
                onClick={() => { setShowCashClosedConfirm(false); submitMovement(false, true); }}
                disabled={loading}
                className="w-full py-2.5 rounded-xl border-2 border-amber-400 text-amber-800 bg-amber-50 text-xs font-medium hover:bg-amber-100 transition-colors disabled:opacity-60"
                data-testid="button-proceed-without-cash"
              >
                {loading ? "Salvando..." : "Entendi o impacto — atualizar só o estoque"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryModal({
  item,
  materialName,
  onClose,
}: {
  item: StockItem;
  materialName: string;
  onClose: () => void;
}) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stock-movements/${item.id}`)
      .then((r) => r.json())
      .then((data) => { setMovements(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [item.id]);

  const typeCfg: Record<string, { label: string; color: string }> = {
    entrada: { label: "Entrada", color: "bg-emerald-100 text-emerald-700" },
    saida: { label: "Saída", color: "bg-red-100 text-red-700" },
    ajuste: { label: "Ajuste", color: "bg-blue-100 text-blue-700" },
    pedido: { label: "Pedido", color: "bg-purple-100 text-purple-700" },
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg border border-card-border max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-semibold text-base flex items-center gap-2"><History className="w-4 h-4" />Histórico de Movimentações</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{materialName} — {item.brand} ({item.color})</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <p className="text-center text-muted-foreground text-sm py-8">Carregando...</p>
          ) : movements.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhuma movimentação registrada.</p>
              <p className="text-xs mt-1">Use os botões de Entrada/Saída/Ajuste para registrar movimentos.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {movements.map((m) => {
                const cfg = typeCfg[m.type] || { label: m.type, color: "bg-gray-100 text-gray-700" };
                const direction = m.type === "entrada" ? "+" : m.type === "saida" ? "-" : "→";
                const qtyColor = m.type === "entrada" ? "text-emerald-600" : m.type === "saida" ? "text-red-600" : "text-blue-600";
                return (
                  <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-secondary/20 transition-colors" data-testid={`row-movement-${m.id}`}>
                    <div className="flex-shrink-0 pt-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-mono font-semibold text-sm ${qtyColor}`}>
                          {direction}{formatQty(m.quantity)}
                        </span>
                        <span className="text-xs text-muted-foreground">{m.date}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
                        <span>{formatQty(m.previousQuantity)} → {formatQty(m.newQuantity)}</span>
                      </div>
                      {m.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{m.notes}</p>}
                      {m.triggeredBy === "pedido" && <p className="text-xs text-purple-600 mt-0.5">Gerado por pedido</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-border text-sm hover:bg-secondary/50 transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  );
}

function NewMaterialTypeModal({ onClose, onCreated }: { onClose: () => void; onCreated: (mat: any) => void }) {
  const { addMaterial } = useAppState();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [costPerKg, setCostPerKg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Erro", description: "Informe o nome do tipo de material.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const created = await (addMaterial as any)({ name: name.trim(), costPerKg: Number(costPerKg) || 0 });
      toast({ title: "Tipo criado", description: `"${name.trim()}" adicionado aos tipos de material.` });
      onCreated(created);
      onClose();
    } catch (e: any) {
      toast({ title: "Erro", description: "Não foi possível criar o tipo de material.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm border border-card-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-base flex items-center gap-2"><Layers className="w-4 h-4" />Novo Tipo de Material</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Nome do tipo</label>
            <input
              type="text"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
              placeholder="Ex: Resina Rígida, Cola, LED, Embalagem..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              autoFocus
              data-testid="input-new-material-type-name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Custo padrão (R$/kg) — opcional</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
              placeholder="0,00"
              value={costPerKg}
              onChange={(e) => setCostPerKg(e.target.value)}
              data-testid="input-new-material-type-cost"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm hover:bg-secondary/50 transition-colors">Cancelar</button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              data-testid="button-confirm-new-material-type"
            >
              {loading ? "Criando..." : "Criar Tipo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const { inventory, stockItems, brands, addStockItem, updateStockItem, deleteStockItem, addBrand } = useAppState();
  const { toast } = useToast();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ materialId: "", brand: "", color: "", cost: 0, quantity: 0, minQuantity: 200 });
  const [editItem, setEditItem] = useState<StockItem | null>(null);

  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [showNewBrandInput, setShowNewBrandInput] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [showEditNewBrandInput, setShowEditNewBrandInput] = useState(false);
  const [editNewBrandName, setEditNewBrandName] = useState("");

  const [movementItem, setMovementItem] = useState<StockItem | null>(null);
  const [historyItem, setHistoryItem] = useState<StockItem | null>(null);
  const [showNewMaterialType, setShowNewMaterialType] = useState(false);

  const [localStock, setLocalStock] = useState<StockItem[]>(stockItems);
  useEffect(() => { setLocalStock(stockItems); }, [stockItems]);

  const sortedBrands = [...brands].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedStockItems = [...localStock].sort((a, b) => {
    if (!sortField) return 0;
    const valA = (a[sortField] || "").toLowerCase();
    const valB = (b[sortField] || "").toLowerCase();
    const result = valA.localeCompare(valB, "pt-BR");
    return sortDirection === "asc" ? result : -result;
  });

  const handleAddBrand = async (isEdit: boolean) => {
    const name = isEdit ? editNewBrandName : newBrandName;
    if (!name.trim()) return;
    try {
      const created = await addBrand(name.trim());
      if (isEdit) {
        setEditItem((prev) => (prev ? { ...prev, brand: created.name } : null));
        setEditNewBrandName("");
        setShowEditNewBrandInput(false);
      } else {
        setNewItem((prev) => ({ ...prev, brand: created.name }));
        setNewBrandName("");
        setShowNewBrandInput(false);
      }
      toast({ title: "Marca cadastrada", description: `"${created.name}" adicionada com sucesso.` });
    } catch {
      toast({ title: "Erro", description: "Não foi possível cadastrar a marca.", variant: "destructive" });
    }
  };

  const handleAdd = () => {
    if (!newItem.materialId || !newItem.brand || !newItem.color || newItem.cost <= 0 || newItem.quantity <= 0) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }
    const exists = localStock.find(
      (s) => s.materialId === newItem.materialId && s.brand === newItem.brand && s.color.toLowerCase() === newItem.color.toLowerCase()
    );
    if (exists) {
      toast({ title: "Erro", description: "Este material já existe no estoque. Edite o existente.", variant: "destructive" });
      return;
    }
    addStockItem(newItem as any);
    setNewItem({ materialId: "", brand: "", color: "", cost: 0, quantity: 0, minQuantity: 200 });
    setIsAdding(false);
    setShowNewBrandInput(false);
    setNewBrandName("");
    toast({ title: "Adicionado", description: "Material adicionado ao estoque." });
  };

  const handleUpdate = () => {
    if (editItem) {
      const exists = localStock.find(
        (s) => s.id !== editItem.id && s.materialId === editItem.materialId && s.brand === editItem.brand && s.color.toLowerCase() === editItem.color.toLowerCase()
      );
      if (exists) {
        toast({ title: "Erro", description: "Este material já existe no estoque.", variant: "destructive" });
        return;
      }
      updateStockItem(editItem);
      setEditingId(null);
      setShowEditNewBrandInput(false);
      setEditNewBrandName("");
      toast({ title: "Atualizado", description: "Material atualizado." });
    }
  };

  const getMaterialName = (id: string) => inventory.find((m) => m.id === id)?.name || "Desconhecido";

  const handleMovementSaved = (updatedItem: StockItem) => {
    setLocalStock((prev) => prev.map((s) => (s.id === updatedItem.id ? updatedItem : s)));
    updateStockItem(updatedItem);
  };

  const renderBrandSelect = (
    value: string,
    onChange: (val: string) => void,
    showNew: boolean,
    setShowNew: (v: boolean) => void,
    newName: string,
    setNewName: (v: string) => void,
    isEdit: boolean
  ) => (
    <div className="flex flex-col gap-1">
      {showNew ? (
        <div className="flex gap-1">
          <input
            type="text"
            placeholder="Nome da nova marca"
            className="flex-1 bg-input border border-border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddBrand(isEdit); }}
            data-testid={isEdit ? "input-edit-new-brand" : "input-new-brand"}
          />
          <button onClick={() => handleAddBrand(isEdit)} className="text-success hover:bg-success/10 p-1.5 rounded-lg" title="Salvar marca" data-testid={isEdit ? "button-save-edit-brand" : "button-save-brand"}>
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setShowNew(false); setNewName(""); }} className="text-muted-foreground hover:bg-secondary p-1.5 rounded-lg" title="Cancelar">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex gap-1">
          <select
            className="flex-1 bg-input border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            data-testid={isEdit ? "select-edit-brand" : "select-brand"}
          >
            <option value="" disabled>Selecione a marca</option>
            {sortedBrands.map((brand) => (
              <option key={brand.id} value={brand.name}>{brand.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowNew(true)}
            className="text-primary hover:bg-primary/10 p-1.5 rounded-lg border border-border"
            title="Cadastrar nova marca"
            data-testid={isEdit ? "button-edit-add-brand" : "button-add-brand"}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  const lowStockCount = localStock.filter((s) => s.quantity <= (s.minQuantity ?? 200) && s.quantity > 0).length;
  const zeroStockCount = localStock.filter((s) => s.quantity <= 0).length;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {movementItem && (
        <MovementModal
          item={movementItem}
          materialName={getMaterialName(movementItem.materialId)}
          onClose={() => setMovementItem(null)}
          onSaved={handleMovementSaved}
        />
      )}
      {historyItem && (
        <HistoryModal
          item={historyItem}
          materialName={getMaterialName(historyItem.materialId)}
          onClose={() => setHistoryItem(null)}
        />
      )}
      {showNewMaterialType && (
        <NewMaterialTypeModal
          onClose={() => setShowNewMaterialType(false)}
          onCreated={() => {}}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold" data-testid="text-inventory-title">Estoque de Materiais</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gerencie filamentos, resinas e demais insumos.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowNewMaterialType(true)}
            className="flex items-center gap-2 border border-border hover:bg-secondary/50 px-4 py-2 rounded-xl transition-colors font-medium text-sm"
            data-testid="button-new-material-type"
          >
            <Layers className="w-4 h-4" />
            Novo Tipo
          </button>
          <button
            onClick={() => {
              setIsAdding(!isAdding);
              if (!isAdding && inventory.length > 0) {
                setNewItem((prev) => ({ ...prev, materialId: inventory[0].id }));
              }
            }}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl transition-colors font-medium text-sm"
            data-testid="button-new-material"
          >
            <PackagePlus className="w-5 h-5" />
            Novo Material
          </button>
        </div>
      </div>

      {(lowStockCount > 0 || zeroStockCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {zeroStockCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span><strong>{zeroStockCount}</strong> material(is) com estoque zerado</span>
            </div>
          )}
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span><strong>{lowStockCount}</strong> material(is) com estoque baixo</span>
            </div>
          )}
        </div>
      )}

      <div className="bg-card rounded-2xl border border-card-border shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[750px]">
          <thead className="bg-secondary/30 border-b border-border/50">
            <tr>
              <th className="px-3 sm:px-5 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Tipo de Material</th>
              <th className="px-3 sm:px-5 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                <button onClick={() => handleSort("brand")} className="flex items-center gap-1.5 hover:text-foreground transition-colors" data-testid="button-sort-brand">
                  Marca
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === "brand" ? "text-primary" : ""}`} />
                  {sortField === "brand" && <span className="text-primary text-[10px]">{sortDirection === "asc" ? "A-Z" : "Z-A"}</span>}
                </button>
              </th>
              <th className="px-3 sm:px-5 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                <button onClick={() => handleSort("color")} className="flex items-center gap-1.5 hover:text-foreground transition-colors" data-testid="button-sort-color">
                  Cor
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === "color" ? "text-primary" : ""}`} />
                  {sortField === "color" && <span className="text-primary text-[10px]">{sortDirection === "asc" ? "A-Z" : "Z-A"}</span>}
                </button>
              </th>
              <th className="px-3 sm:px-5 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Valor (R$/kg)</th>
              <th className="px-3 sm:px-5 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Qtd em Estoque</th>
              <th className="px-3 sm:px-5 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {isAdding && (
              <tr className="bg-secondary/10">
                <td className="px-5 py-3">
                  <select
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                    value={newItem.materialId}
                    onChange={(e) => setNewItem({ ...newItem, materialId: e.target.value })}
                    data-testid="select-material"
                  >
                    <option value="" disabled>Selecione um material</option>
                    {inventory.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3">
                  {renderBrandSelect(newItem.brand, (val) => setNewItem({ ...newItem, brand: val }), showNewBrandInput, setShowNewBrandInput, newBrandName, setNewBrandName, false)}
                </td>
                <td className="px-5 py-3">
                  <input
                    type="text"
                    placeholder="Ex: Preto"
                    className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    value={newItem.color}
                    onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                    data-testid="input-color"
                  />
                </td>
                <td className="px-5 py-3">
                  <input
                    type="number"
                    placeholder="R$/kg"
                    className="w-24 bg-input border border-border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    value={newItem.cost || ""}
                    onChange={(e) => setNewItem({ ...newItem, cost: Number(e.target.value) })}
                    data-testid="input-cost"
                  />
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-1">
                    <input
                      type="number"
                      placeholder="Qtd (g)"
                      className="w-24 bg-input border border-border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                      value={newItem.quantity || ""}
                      onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                      data-testid="input-quantity"
                    />
                    <input
                      type="number"
                      placeholder="Mín (g)"
                      className="w-24 bg-input border border-border rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary/50 outline-none text-muted-foreground"
                      value={newItem.minQuantity || ""}
                      onChange={(e) => setNewItem({ ...newItem, minQuantity: Number(e.target.value) })}
                      data-testid="input-min-quantity"
                      title="Quantidade mínima para alerta de estoque baixo"
                    />
                  </div>
                </td>
                <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                  <button onClick={handleAdd} className="text-success hover:text-success/80 p-2 rounded-lg hover:bg-success/10 transition-colors" title="Salvar" data-testid="button-save-item"><Check className="w-4 h-4" /></button>
                  <button onClick={() => { setIsAdding(false); setShowNewBrandInput(false); setNewBrandName(""); }} className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-secondary transition-colors" title="Cancelar" data-testid="button-cancel-add"><X className="w-4 h-4" /></button>
                </td>
              </tr>
            )}

            {sortedStockItems.length === 0 && !isAdding ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                  Nenhum material no estoque. Clique em "Novo Material" para adicionar.
                </td>
              </tr>
            ) : (
              sortedStockItems.map((item) => {
                const minQty = (item as any).minQuantity ?? 200;
                const isZero = item.quantity <= 0;
                const isLow = !isZero && item.quantity <= minQty;
                return (
                  <tr key={item.id} className={`hover:bg-secondary/10 transition-colors group ${isZero ? "bg-red-50/30" : isLow ? "bg-amber-50/20" : ""}`} data-testid={`row-stock-${item.id}`}>
                    <td className="px-5 py-4">
                      {editingId === item.id ? (
                        <select
                          className="w-full bg-input border border-border rounded-lg px-3 py-1.5 outline-none text-sm"
                          value={editItem?.materialId || ""}
                          onChange={(e) => setEditItem((prev) => prev ? { ...prev, materialId: e.target.value } : null)}
                        >
                          {inventory.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      ) : (
                        <span className="font-medium">{getMaterialName(item.materialId)}</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {editingId === item.id ? renderBrandSelect(editItem?.brand || "", (val) => setEditItem((prev) => prev ? { ...prev, brand: val } : null), showEditNewBrandInput, setShowEditNewBrandInput, editNewBrandName, setEditNewBrandName, true) : item.brand}
                    </td>
                    <td className="px-5 py-4">
                      {editingId === item.id ? (
                        <input
                          type="text"
                          className="w-full bg-input border border-border rounded-lg px-3 py-1.5 outline-none text-sm"
                          value={editItem?.color || ""}
                          onChange={(e) => setEditItem((prev) => prev ? { ...prev, color: e.target.value } : null)}
                        />
                      ) : item.color}
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {editingId === item.id ? (
                        <input
                          type="number"
                          className="w-24 bg-input border border-border rounded-lg px-3 py-1.5 outline-none text-sm"
                          value={editItem?.cost || ""}
                          onChange={(e) => setEditItem((prev) => prev ? { ...prev, cost: Number(e.target.value) } : null)}
                        />
                      ) : formatCurrency(item.cost)}
                    </td>
                    <td className="px-5 py-4">
                      {editingId === item.id ? (
                        <div className="flex flex-col gap-1.5">
                          <input
                            type="number"
                            className="w-24 bg-input border border-border rounded-lg px-3 py-1.5 outline-none font-mono text-sm"
                            value={editItem?.quantity || ""}
                            onChange={(e) => setEditItem((prev) => prev ? { ...prev, quantity: Number(e.target.value) } : null)}
                            title="Quantidade atual (g)"
                          />
                          <input
                            type="number"
                            placeholder="Mín (g)"
                            className="w-24 bg-input border border-border rounded-lg px-3 py-1.5 outline-none text-xs text-muted-foreground"
                            value={(editItem as any)?.minQuantity ?? 200}
                            onChange={(e) => setEditItem((prev) => prev ? { ...prev, minQuantity: Number(e.target.value) } as any : null)}
                            title="Quantidade mínima para alerta"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{formatQty(item.quantity)}</span>
                            <StockBadge quantity={item.quantity} minQuantity={minQty} />
                          </div>
                          <div className="w-24 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isZero ? "bg-red-500" : isLow ? "bg-amber-400" : "bg-emerald-500"}`}
                              style={{ width: `${Math.min((item.quantity / 1000) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">Mín: {formatQty(minQty)}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 sm:px-5 py-4 text-right">
                      <div className="flex justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-wrap">
                        {editingId === item.id ? (
                          <>
                            <button onClick={handleUpdate} className="text-success hover:bg-success/10 p-2 rounded-lg" title="Salvar" data-testid={`button-save-edit-${item.id}`}><Check className="w-4 h-4" /></button>
                            <button onClick={() => { setEditingId(null); setShowEditNewBrandInput(false); setEditNewBrandName(""); }} className="text-muted-foreground hover:bg-secondary p-2 rounded-lg" title="Cancelar"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setMovementItem({ ...item, type: "entrada" } as any)}
                              className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg"
                              title="Entrada de estoque"
                              data-testid={`button-entrada-${item.id}`}
                            >
                              <TrendingUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setMovementItem({ ...item, type: "saida" } as any)}
                              className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
                              title="Saída de estoque"
                              data-testid={`button-saida-${item.id}`}
                            >
                              <TrendingDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setHistoryItem(item)}
                              className="text-muted-foreground hover:bg-secondary/80 p-2 rounded-lg"
                              title="Histórico de movimentações"
                              data-testid={`button-history-${item.id}`}
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setEditingId(item.id); setEditItem(item); }}
                              className="text-primary hover:bg-primary/10 p-2 rounded-lg"
                              title="Editar"
                              data-testid={`button-edit-${item.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm("Tem certeza que deseja excluir este material do estoque?")) {
                              deleteStockItem(item.id);
                              setLocalStock((prev) => prev.filter((s) => s.id !== item.id));
                              toast({ title: "Excluído", description: "Material removido do estoque." });
                            }
                          }}
                          className="text-destructive hover:bg-destructive/10 p-2 rounded-lg"
                          title="Excluir"
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
