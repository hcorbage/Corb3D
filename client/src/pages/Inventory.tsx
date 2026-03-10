import { useState } from "react";
import { useAppState, StockItem } from "../context/AppState";
import { PackagePlus, Trash2, Edit2, Check, X, Eye, ArrowUpDown, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SortField = "brand" | "color" | null;
type SortDirection = "asc" | "desc";

export default function Inventory() {
  const { inventory, stockItems, brands, addStockItem, updateStockItem, deleteStockItem, addBrand } = useAppState();
  const { toast } = useToast();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newItem, setNewItem] = useState({ materialId: "", brand: "", color: "", cost: 0, quantity: 0 });
  const [editItem, setEditItem] = useState<StockItem | null>(null);

  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [showNewBrandInput, setShowNewBrandInput] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [showEditNewBrandInput, setShowEditNewBrandInput] = useState(false);
  const [editNewBrandName, setEditNewBrandName] = useState("");

  const sortedBrands = [...brands].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedStockItems = [...stockItems].sort((a, b) => {
    if (!sortField) return 0;
    const valA = (a[sortField] || "").toLowerCase();
    const valB = (b[sortField] || "").toLowerCase();
    const result = valA.localeCompare(valB, 'pt-BR');
    return sortDirection === "asc" ? result : -result;
  });

  const handleAddBrand = async (isEdit: boolean) => {
    const name = isEdit ? editNewBrandName : newBrandName;
    if (!name.trim()) return;
    try {
      const created = await addBrand(name.trim());
      if (isEdit) {
        setEditItem(prev => prev ? { ...prev, brand: created.name } : null);
        setEditNewBrandName("");
        setShowEditNewBrandInput(false);
      } else {
        setNewItem(prev => ({ ...prev, brand: created.name }));
        setNewBrandName("");
        setShowNewBrandInput(false);
      }
      toast({ title: "Marca cadastrada", description: `"${created.name}" adicionada com sucesso.` });
    } catch (e: any) {
      toast({ title: "Erro", description: "Não foi possível cadastrar a marca. Verifique se já existe.", variant: "destructive" });
    }
  };

  const handleAdd = () => {
    if (!newItem.materialId || !newItem.brand || !newItem.color || newItem.cost <= 0 || newItem.quantity <= 0) {
      toast({ title: "Erro", description: "Preencha todos os campos corretamente.", variant: "destructive" });
      return;
    }
    
    const exists = stockItems.find(s => s.materialId === newItem.materialId && s.brand === newItem.brand && s.color.toLowerCase() === newItem.color.toLowerCase());
    if (exists) {
      toast({ title: "Erro", description: "Este material desta marca com esta cor já existe no estoque. Edite o existente.", variant: "destructive" });
      return;
    }

    addStockItem(newItem);
    setNewItem({ materialId: "", brand: "", color: "", cost: 0, quantity: 0 });
    setIsAdding(false);
    setShowNewBrandInput(false);
    setNewBrandName("");
    toast({ title: "Adicionado", description: "Produto adicionado ao estoque." });
  };

  const handleUpdate = () => {
    if (editItem) {
      const exists = stockItems.find(s => s.id !== editItem.id && s.materialId === editItem.materialId && s.brand === editItem.brand && s.color.toLowerCase() === editItem.color.toLowerCase());
      if (exists) {
        toast({ title: "Erro", description: "Este material desta marca com esta cor já existe no estoque.", variant: "destructive" });
        return;
      }
      updateStockItem(editItem);
      setEditingId(null);
      setShowEditNewBrandInput(false);
      setEditNewBrandName("");
      toast({ title: "Atualizado", description: "Produto atualizado." });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getMaterialName = (id: string) => {
    return inventory.find(m => m.id === id)?.name || "Desconhecido";
  };

  const handleView = (item: StockItem) => {
    toast({
      title: "Detalhes do Material",
      description: `${getMaterialName(item.materialId)} - ${item.brand} (${item.color}) | Estoque: ${item.quantity}g | Custo: ${formatCurrency(item.cost)}`
    });
  };

  const renderBrandSelect = (value: string, onChange: (val: string) => void, showNew: boolean, setShowNew: (v: boolean) => void, newName: string, setNewName: (v: string) => void, isEdit: boolean) => (
    <div className="flex flex-col gap-1">
      {showNew ? (
        <div className="flex gap-1">
          <input
            type="text"
            placeholder="Nome da nova marca"
            className="flex-1 bg-input border border-border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddBrand(isEdit); }}
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
            {sortedBrands.map(brand => (
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

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold" data-testid="text-inventory-title">Estoque de Materiais</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gerencie os filamentos e resinas em estoque.</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            if (!isAdding && inventory.length > 0) {
               setNewItem({ ...newItem, materialId: inventory[0].id });
            }
          }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl transition-colors font-medium"
          data-testid="button-new-material"
        >
          <PackagePlus className="w-5 h-5" />
          Novo Material
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-card-border shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[600px]">
          <thead className="bg-secondary/30 border-b border-border/50">
            <tr>
              <th className="px-3 sm:px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Tipo de Material</th>
              <th className="px-3 sm:px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                <button
                  onClick={() => handleSort("brand")}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  data-testid="button-sort-brand"
                >
                  Marca
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'brand' ? 'text-primary' : ''}`} />
                  {sortField === 'brand' && (
                    <span className="text-primary text-[10px]">{sortDirection === 'asc' ? 'A-Z' : 'Z-A'}</span>
                  )}
                </button>
              </th>
              <th className="px-3 sm:px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                <button
                  onClick={() => handleSort("color")}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  data-testid="button-sort-color"
                >
                  Cor
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === 'color' ? 'text-primary' : ''}`} />
                  {sortField === 'color' && (
                    <span className="text-primary text-[10px]">{sortDirection === 'asc' ? 'A-Z' : 'Z-A'}</span>
                  )}
                </button>
              </th>
              <th className="px-3 sm:px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Valor (R$)</th>
              <th className="px-3 sm:px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Qtd (g/Kg)</th>
              <th className="px-3 sm:px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {isAdding && (
              <tr className="bg-secondary/10">
                <td className="px-6 py-3">
                  <select 
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none"
                    value={newItem.materialId}
                    onChange={(e) => setNewItem({...newItem, materialId: e.target.value})}
                    data-testid="select-material"
                  >
                    <option value="" disabled>Selecione um material</option>
                    {inventory.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-3">
                  {renderBrandSelect(
                    newItem.brand,
                    (val) => setNewItem({...newItem, brand: val}),
                    showNewBrandInput,
                    setShowNewBrandInput,
                    newBrandName,
                    setNewBrandName,
                    false
                  )}
                </td>
                <td className="px-6 py-3">
                  <input 
                    type="text" 
                    placeholder="Ex: Preto"
                    className="w-full bg-input border border-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary/50 outline-none"
                    value={newItem.color}
                    onChange={(e) => setNewItem({...newItem, color: e.target.value})}
                    data-testid="input-color"
                  />
                </td>
                <td className="px-6 py-3">
                  <input 
                    type="number" 
                    placeholder="Valor"
                    className="w-24 bg-input border border-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary/50 outline-none"
                    value={newItem.cost || ''}
                    onChange={(e) => setNewItem({...newItem, cost: Number(e.target.value)})}
                    data-testid="input-cost"
                  />
                </td>
                <td className="px-6 py-3">
                  <input 
                    type="number" 
                    placeholder="Qtd"
                    className="w-24 bg-input border border-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary/50 outline-none"
                    value={newItem.quantity || ''}
                    onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                    data-testid="input-quantity"
                  />
                </td>
                <td className="px-6 py-3 text-right space-x-2 whitespace-nowrap">
                  <button onClick={handleAdd} className="text-success hover:text-success/80 p-2 rounded-lg hover:bg-success/10 transition-colors" title="Salvar" data-testid="button-save-item">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setIsAdding(false); setShowNewBrandInput(false); setNewBrandName(""); }} className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-secondary transition-colors" title="Cancelar" data-testid="button-cancel-add">
                    <X className="w-4 h-4" />
                  </button>
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
              sortedStockItems.map((item) => (
                <tr key={item.id} className="hover:bg-secondary/10 transition-colors group" data-testid={`row-stock-${item.id}`}>
                  <td className="px-6 py-4">
                    {editingId === item.id ? (
                      <select 
                        className="w-full bg-input border border-border rounded-lg px-3 py-1.5 outline-none"
                        value={editItem?.materialId || ''}
                        onChange={(e) => setEditItem(prev => prev ? {...prev, materialId: e.target.value} : null)}
                      >
                        {inventory.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-medium">{getMaterialName(item.materialId)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === item.id ? (
                      renderBrandSelect(
                        editItem?.brand || '',
                        (val) => setEditItem(prev => prev ? {...prev, brand: val} : null),
                        showEditNewBrandInput,
                        setShowEditNewBrandInput,
                        editNewBrandName,
                        setEditNewBrandName,
                        true
                      )
                    ) : (
                      item.brand
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === item.id ? (
                      <input 
                        type="text" 
                        className="w-full bg-input border border-border rounded-lg px-3 py-1.5 outline-none"
                        value={editItem?.color || ''}
                        onChange={(e) => setEditItem(prev => prev ? {...prev, color: e.target.value} : null)}
                      />
                    ) : (
                      item.color
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono">
                    {editingId === item.id ? (
                      <input 
                        type="number" 
                        className="w-24 bg-input border border-border rounded-lg px-3 py-1.5 outline-none"
                        value={editItem?.cost || ''}
                        onChange={(e) => setEditItem(prev => prev ? {...prev, cost: Number(e.target.value)} : null)}
                      />
                    ) : (
                      formatCurrency(item.cost)
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === item.id ? (
                      <input 
                        type="number" 
                        className="w-24 bg-input border border-border rounded-lg px-3 py-1.5 outline-none font-mono"
                        value={editItem?.quantity || ''}
                        onChange={(e) => setEditItem(prev => prev ? {...prev, quantity: Number(e.target.value)} : null)}
                      />
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <span className="font-mono">{item.quantity >= 1000 ? `${(item.quantity/1000).toFixed(2)} Kg` : `${item.quantity} g`}</span>
                        <div className="w-24 h-1.5 bg-secondary/50 rounded-full overflow-hidden" title={`${Math.min((item.quantity / 1000) * 100, 100).toFixed(0)}%`}>
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.quantity > 500 ? 'bg-[#50c878]' : item.quantity > 200 ? 'bg-[#ffc107]' : 'bg-[#ff6b6b]'
                            }`}
                            style={{ width: `${Math.min((item.quantity / 1000) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {editingId === item.id ? (
                        <>
                          <button onClick={handleUpdate} className="text-success hover:bg-success/10 p-2 rounded-lg" title="Salvar" data-testid={`button-save-edit-${item.id}`}>
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingId(null); setShowEditNewBrandInput(false); setEditNewBrandName(""); }} className="text-muted-foreground hover:bg-secondary p-2 rounded-lg" title="Cancelar">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleView(item)} 
                            className="text-muted-foreground hover:bg-secondary/80 p-2 rounded-lg"
                            title="Visualizar"
                            data-testid={`button-view-${item.id}`}
                          >
                            <Eye className="w-4 h-4" />
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
