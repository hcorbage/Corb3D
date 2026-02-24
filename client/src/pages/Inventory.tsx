import { useState } from "react";
import { useAppState, StockItem } from "../context/AppState";
import { PackagePlus, Trash2, Edit2, Check, X, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Inventory() {
  const { inventory, stockItems, addStockItem, updateStockItem, deleteStockItem } = useAppState();
  const { toast } = useToast();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newItem, setNewItem] = useState({ materialId: "", brand: "", color: "", cost: 0, quantity: 0 });
  const [editItem, setEditItem] = useState<StockItem | null>(null);

  const BRANDS = [
    // Nacionais (Brasil)
    "3DFila", "Voolt3D", "Sethi3D", "PrintaLot", "GTMax", "Fila3D", "Cliever", "Copymaker", "Natur3D",
    // Importadas
    "eSun", "Sunlu", "Polymaker", "Creality", "Bambu Lab", "Anycubic", "Elegoo", "Prusament", "Hatchbox", "Overture", "MatterHackers", "Siraya Tech", "Phrozen"
  ].sort();

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

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">Estoque de Materiais</h1>
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
              <th className="px-3 sm:px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Marca</th>
              <th className="px-3 sm:px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Cor</th>
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
                  >
                    <option value="" disabled>Selecione um material</option>
                    {inventory.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-3">
                  <select 
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none"
                    value={newItem.brand}
                    onChange={(e) => setNewItem({...newItem, brand: e.target.value})}
                  >
                    <option value="" disabled>Selecione a marca</option>
                    {BRANDS.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-3">
                  <input 
                    type="text" 
                    placeholder="Ex: Preto"
                    className="w-full bg-input border border-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary/50 outline-none"
                    value={newItem.color}
                    onChange={(e) => setNewItem({...newItem, color: e.target.value})}
                  />
                </td>
                <td className="px-6 py-3">
                  <input 
                    type="number" 
                    placeholder="Valor"
                    className="w-24 bg-input border border-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary/50 outline-none"
                    value={newItem.cost || ''}
                    onChange={(e) => setNewItem({...newItem, cost: Number(e.target.value)})}
                  />
                </td>
                <td className="px-6 py-3">
                  <input 
                    type="number" 
                    placeholder="Qtd"
                    className="w-24 bg-input border border-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary/50 outline-none"
                    value={newItem.quantity || ''}
                    onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                  />
                </td>
                <td className="px-6 py-3 text-right space-x-2 whitespace-nowrap">
                  <button onClick={handleAdd} className="text-success hover:text-success/80 p-2 rounded-lg hover:bg-success/10 transition-colors" title="Salvar">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setIsAdding(false)} className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-secondary transition-colors" title="Cancelar">
                    <X className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            )}
            
            {stockItems.length === 0 && !isAdding ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                  Nenhum material no estoque. Clique em "Novo Material" para adicionar.
                </td>
              </tr>
            ) : (
              stockItems.map((item) => (
                <tr key={item.id} className="hover:bg-secondary/10 transition-colors group">
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
                      <select 
                        className="w-full bg-input border border-border rounded-lg px-3 py-1.5 outline-none"
                        value={editItem?.brand || ''}
                        onChange={(e) => setEditItem(prev => prev ? {...prev, brand: e.target.value} : null)}
                      >
                        {BRANDS.map(brand => (
                          <option key={brand} value={brand}>{brand}</option>
                        ))}
                      </select>
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
                        value={editItem?.cost || 0}
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
                        value={editItem?.quantity || 0}
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
                          <button onClick={handleUpdate} className="text-success hover:bg-success/10 p-2 rounded-lg" title="Salvar">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:bg-secondary p-2 rounded-lg" title="Cancelar">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleView(item)} 
                            className="text-muted-foreground hover:bg-secondary/80 p-2 rounded-lg"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { setEditingId(item.id); setEditItem(item); }} 
                            className="text-primary hover:bg-primary/10 p-2 rounded-lg"
                            title="Editar"
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
