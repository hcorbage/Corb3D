import { useState, useEffect, useRef } from "react";
import { Clock, Calendar as CalendarIcon, RotateCcw, Save, FileText, Phone, ChevronDown, Plus, Trash2, X, Download } from "lucide-react";
import { useAppState } from "../context/AppState";
import { useAuth } from "../context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type ProjectItem = {
  id: string;
  description: string;
  materialId: string;
  weight: number;
  hours: number;
  minutes: number;
  qty: number;
  unitValue: number;
};

const capitalizeFirst = (str: string) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function Calculator() {
  const { clients, inventory, employees, addCalculation, updateCalculation, addClient, updateClient, settings, printers, stockItems, updateStockItem } = useAppState();
  const { isAdmin, id: currentUserId } = useAuth();
  const { toast } = useToast();
  const [time, setTime] = useState(new Date());

  // Form State
  const [clientSearch, setClientSearch] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientDoc, setClientDoc] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCep, setClientCep] = useState("");
  const [clientStreet, setClientStreet] = useState("");
  const [clientNumber, setClientNumber] = useState("");
  const [clientComplement, setClientComplement] = useState("");
  const [clientNeighborhood, setClientNeighborhood] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientUf, setClientUf] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  
  // Project Details
  const [projectName, setProjectName] = useState("");
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [qty, setQty] = useState(1);
  const [weight, setWeight] = useState(0);
  const [materialId, setMaterialId] = useState("");
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [delivery, setDelivery] = useState("");

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [editingCalculationId, setEditingCalculationId] = useState<string | null>(null);
  const [editingCalculationDate, setEditingCalculationDate] = useState<string | null>(null);
  const [overrideMargin, setOverrideMargin] = useState<number | null>(null);

  // Load draft from local storage on mount
  useEffect(() => {
    const draft = localStorage.getItem('calculator_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.clientSearch) setClientSearch(parsed.clientSearch);
        if (parsed.clientPhone) setClientPhone(parsed.clientPhone);
        if (parsed.clientDoc) setClientDoc(parsed.clientDoc);
        if (parsed.clientEmail) setClientEmail(parsed.clientEmail);
        if (parsed.clientCep) setClientCep(parsed.clientCep);
        if (parsed.clientStreet) setClientStreet(parsed.clientStreet);
        if (parsed.clientNumber) setClientNumber(parsed.clientNumber);
        if (parsed.clientComplement) setClientComplement(parsed.clientComplement);
        if (parsed.clientNeighborhood) setClientNeighborhood(parsed.clientNeighborhood);
        if (parsed.clientCity) setClientCity(parsed.clientCity);
        if (parsed.clientUf) setClientUf(parsed.clientUf);
        if (parsed.projectName) setProjectName(parsed.projectName);
        if (parsed.projectItems && parsed.projectItems.length > 0) setProjectItems(parsed.projectItems);
        if (parsed.delivery) setDelivery(parsed.delivery);
        if (parsed.selectedEmployeeId) setSelectedEmployeeId(parsed.selectedEmployeeId);
        if (parsed.editingCalculationId) setEditingCalculationId(parsed.editingCalculationId);
        if (parsed.editingCalculationDate) setEditingCalculationDate(parsed.editingCalculationDate);
        if (parsed.profitMarginUsed != null) setOverrideMargin(parsed.profitMarginUsed);
        if (parsed.selectedClientId) {
          const client = clients.find(c => c.id === parsed.selectedClientId);
          if (client) setSelectedClient(client);
        }
      } catch (e) {
        console.error("Error loading draft", e);
      }
    }
  }, [clients]);

  // Save draft to local storage on change
  useEffect(() => {
    const draft = {
      clientSearch, clientPhone, clientDoc, clientEmail, clientCep, clientStreet, clientNumber,
      clientComplement, clientNeighborhood, clientCity, clientUf, projectName, projectItems, delivery,
      selectedClientId: selectedClient?.id,
      selectedEmployeeId,
      editingCalculationId,
      editingCalculationDate,
      profitMarginUsed: overrideMargin
    };
    localStorage.setItem('calculator_draft', JSON.stringify(draft));
  }, [clientSearch, clientPhone, clientDoc, clientEmail, clientCep, clientStreet, clientNumber, clientComplement, clientNeighborhood, clientCity, clientUf, projectName, projectItems, delivery, selectedClient, selectedEmployeeId, editingCalculationId, editingCalculationDate, overrideMargin]);

  useEffect(() => {
    if (!isAdmin && employees.length > 0 && !selectedEmployeeId) {
      const myEmployee = employees.find(e => e.linkedUserId === currentUserId);
      if (myEmployee) {
        setSelectedEmployeeId(myEmployee.id);
      }
    }
  }, [isAdmin, employees, currentUserId, selectedEmployeeId]);

  // PDF Preview State
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  // Calculation Results
  const energyCostPerHour = (settings.printerPowerWatts / 1000) * settings.kwhCost;
  const depreciationPerHour = settings.printerPurchasePrice / (settings.printerLifespanHours || 6000);
  const effectiveMargin = editingCalculationId && overrideMargin != null ? overrideMargin : settings.profitMargin;
  const profitMargin = effectiveMargin / 100;
  
  const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

  let materialCost = 0;
  let energyCost = 0;
  let depreciationCost = 0;
  let laborCost = 0;
  let finalLotPrice = 0;

  projectItems.forEach(item => {
    const qty = item.qty || 1;
    const costPerKg = item.materialId ? (stockItems.find(s => s.id === item.materialId)?.cost || 0) : 0;
    
    const matCost = costPerKg * ((item.weight || 0) / 1000);
    const itemHours = (item.hours || 0) + ((item.minutes || 0) / 60);
    const enCost = itemHours * energyCostPerHour;
    const depCost = itemHours * depreciationPerHour;
    const labCost = itemHours * settings.laborCostPerHour;
    
    materialCost += matCost * qty;
    energyCost += enCost * qty;
    depreciationCost += depCost * qty;
    laborCost += labCost * qty;
    
    const itemTotalCost = matCost + enCost + depCost + labCost;
    const itemExactPrice = itemTotalCost * (1 + profitMargin);
    // Round the line total so the sum of lines perfectly matches the grand total
    const itemLineTotal = round2(itemExactPrice * qty);
    finalLotPrice += itemLineTotal;
  });

  const totalCostExact = materialCost + energyCost + depreciationCost + laborCost;
  
  materialCost = round2(materialCost);
  energyCost = round2(energyCost);
  depreciationCost = round2(depreciationCost);
  laborCost = round2(laborCost);
  // finalLotPrice is already the sum of rounded line totals, but we round again just in case of float weirdness
  finalLotPrice = round2(finalLotPrice);

  const totalCost = round2(totalCostExact);
  const profitValue = round2(finalLotPrice - totalCost);
  
  const totalQty = projectItems.reduce((acc, item) => acc + (item.qty || 1), 0);
  const unitPrice = totalQty > 0 ? round2(finalLotPrice / totalQty) : 0;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveClient = () => {
    if (!clientSearch) {
      toast({
        title: "Nome obrigatório",
        description: "Preencha o nome do cliente antes de salvar.",
        variant: "destructive"
      });
      return;
    }

    addClient({
      name: clientSearch,
      document: clientDoc || "",
      whatsapp: clientPhone || "",
      email: clientEmail || "",
      cep: clientCep || "",
      street: clientStreet || "",
      number: clientNumber || "",
      complement: clientComplement || "",
      neighborhood: clientNeighborhood || "",
      city: clientCity || "",
      uf: clientUf || ""
    });

    toast({
      title: "Cliente salvo",
      description: "O cliente foi salvo com sucesso!",
    });
  };

  const handleClear = () => {
    setClientSearch("");
    setClientPhone("");
    setClientDoc("");
    setClientEmail("");
    setClientCep("");
    setClientStreet("");
    setClientNumber("");
    setClientComplement("");
    setClientNeighborhood("");
    setClientCity("");
    setClientUf("");
    setSelectedClient(null);
    setProjectName("");
    setProjectItems([]);
    setQty(1);
    setWeight(0);
    setMaterialId("");
    setHours(0);
    setMinutes(0);
    setDelivery("");
    setSelectedEmployeeId("");
    setEditingCalculationId(null);
    setEditingCalculationDate(null);
    setOverrideMargin(null);
    localStorage.removeItem('calculator_draft');
    toast({ title: "Calculadora limpa", description: "Todos os campos foram resetados." });
  };

  const handleSave = () => {
    if (!projectName) {
      toast({ title: "Erro", description: "Preencha o nome do projeto.", variant: "destructive" });
      return;
    }

    let lowStockMessages: string[] = [];

    projectItems.forEach(item => {
      if (item.materialId && item.weight > 0) {
        const stockItem = stockItems.find(s => s.id === item.materialId);
        if (stockItem) {
          const totalWeightUsed = item.weight * (item.qty || 1);
          const newQty = stockItem.quantity - totalWeightUsed;
          
          updateStockItem({
            ...stockItem,
            quantity: newQty
          });
          
          if (newQty <= 0) {
            const matName = inventory.find(m => m.id === stockItem.materialId)?.name || 'Desconhecido';
            lowStockMessages.push(`Estoque esgotado: ${matName} - ${stockItem.brand} (${stockItem.color})`);
          } else if (newQty < 200) {
            const matName = inventory.find(m => m.id === stockItem.materialId)?.name || 'Desconhecido';
            lowStockMessages.push(`Estoque baixo (${newQty}g): ${matName} - ${stockItem.brand} (${stockItem.color})`);
          }
        }
      }
    });

    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
    const calcData = {
      clientName: selectedClient?.name || clientSearch || "Cliente Não Identificado",
      projectName,
      totalCost,
      suggestedPrice: finalLotPrice,
      employeeId: selectedEmployee?.id || null,
      employeeName: selectedEmployee?.name || null,
      details: {
        clientSearch, clientPhone, clientDoc, clientEmail, clientCep, clientStreet, clientNumber,
        clientComplement, clientNeighborhood, clientCity, clientUf, projectName, projectItems, delivery,
        selectedClientId: selectedClient?.id,
        selectedEmployeeId,
        profitMarginUsed: effectiveMargin
      }
    };

    if (editingCalculationId) {
      // Import updateCalculation from useAppState in the destructuring at the top of the file
      // Wait, let me check if updateCalculation is destructured. I need to make sure updateCalculation is destructured in line 27.
      // Actually I should just use `updateCalculation` directly in the replace block
      updateCalculation({
        ...calcData,
        id: editingCalculationId,
        date: editingCalculationDate || new Date().toISOString()
      });
      toast({ title: "Atualizado com sucesso!", description: "Orçamento atualizado e estoque modificado." });
    } else {
      addCalculation(calcData);
      toast({ title: "Salvo com sucesso!", description: "Orçamento salvo e estoque atualizado." });
    }
    
    if (lowStockMessages.length > 0) {
      setTimeout(() => {
        toast({ 
          title: "Atenção: Recarregar Estoque", 
          description: lowStockMessages.join('\n'),
          variant: "destructive" 
        });
      }, 500);
    }

    handleClear();
  };

  const addProjectItem = () => {
    setProjectItems([...projectItems, { id: Date.now().toString(), description: "", materialId: "", weight: 0, hours: 0, minutes: 0, qty: 1, unitValue: 0 }]);
  };

  const updateProjectItem = (id: string, field: keyof ProjectItem, value: any) => {
    setProjectItems(items => items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeProjectItem = (id: string) => {
    setProjectItems(items => items.filter(item => item.id !== id));
  };

  const handleGeneratePdf = () => {
    // Como a exportação direta falha em iframes bloqueados, 
    // a melhor alternativa nativa e 100% garantida é a janela de impressão,
    // onde o usuário seleciona "Salvar como PDF" e escolhe a pasta desejada.
    window.print();
  };

  const handleWhatsApp = async () => {
    let phone = clientPhone.replace(/\D/g, '');
    if (!phone) {
      toast({ title: "Aviso", description: "Preencha o WhatsApp do cliente para enviar direto.", variant: "destructive" });
      return;
    }
    if (!phone.startsWith('55')) phone = '55' + phone;
    
    const hora = new Date().getHours();
    const saudacao = hora < 12 ? 'Bom dia' : (hora < 18 ? 'Boa tarde' : 'Boa noite');
    
    let message = `${saudacao}! Bem-vindo(a) à *CORB3D*, tornamos seu projeto realidade.\nSegue o orçamento solicitado!\n\n`;
    
    message += `*ORÇAMENTO CORB3D*\n\n`;
    
    message += `*DADOS DO PROJETO*\n`;
    message += `Projeto: ${projectName || 'Não especificado'}\n`;
    message += `Prazo: ${delivery || 'A combinar'}\n\n`;

    message += `*CLIENTE*\n`;
    message += `Nome: ${clientSearch || 'Não especificado'}\n`;
    if (clientDoc) message += `Doc: ${clientDoc}\n`;
    if (clientCity) message += `Cidade: ${clientCity}${clientUf ? `/${clientUf}` : ''}\n`;
    message += `\n*ITENS*\n`;
    
    projectItems.forEach((item, index) => {
      const itemMaterialCost = (item.materialId ? (stockItems.find(s => s.id === item.materialId)?.cost || 0) : 0) * ((item.weight || 0) / 1000);
      const itemHours = (item.hours || 0) + ((item.minutes || 0) / 60);
      const itemEnergyCost = itemHours * energyCostPerHour;
      const itemDeprCost = itemHours * depreciationPerHour;
      const itemLaborCost = itemHours * settings.laborCostPerHour;
      const itemOperationCost = itemEnergyCost + itemDeprCost + itemLaborCost;
      const itemTotalCost = itemMaterialCost + itemOperationCost;
      const itemExactPrice = itemTotalCost * (1 + profitMargin);
      const lineTotalDisplay = round2(itemExactPrice * (item.qty || 1));

      message += `${index + 1}. ${item.description || 'Item sem descrição'} (Qtd: ${item.qty || 1}) - ${formatCurrency(lineTotalDisplay)}\n`;
    });

    message += `\n*VALOR TOTAL:* ${formatCurrency(finalLotPrice)}\n\n`;
    message += `Estou enviando o arquivo PDF com os detalhes logo a seguir.\n\n`;
    message += `Obrigado por nos dar a chance de tornar seu Projeto uma Realidade! 🚀`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    
    // Abre o WhatsApp imediatamente para evitar bloqueio de pop-up pelo navegador
    window.open(url, '_blank');
    
    // Gera o PDF logo em seguida
    if (pdfRef.current) {
      toast({ title: "Preparando PDF", description: "Baixando PDF para você enviar no WhatsApp..." });
      setIsGeneratingPdf(true);
      try {
        const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Orcamento_${projectName || 'Corb3D'}.pdf`);
      } catch (e) {
        console.error("Erro ao gerar PDF", e);
        toast({ title: "Aviso", description: "O WhatsApp foi aberto, mas houve um erro ao baixar o PDF.", variant: "destructive" });
      } finally {
        setIsGeneratingPdf(false);
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header Bar */}
      <div className="flex justify-between items-center bg-card p-4 rounded-2xl border border-card-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-full">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-xl font-display font-bold">{format(time, 'HH:mm:ss')}</div>
            <div className="text-xs font-bold text-red-500 uppercase tracking-wider">CORB3D MANAGER 1.0</div>
          </div>
        </div>
        
        <div className="flex flex-col items-end text-right">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{format(time, 'EEEE', { locale: ptBR })}</div>
          <div className="text-sm font-semibold">{format(time, 'dd/MM/yyyy')}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Client ID */}
        <div className="bg-card p-6 rounded-2xl border border-card-border shadow-sm flex flex-col gap-4">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">IDENTIFICAÇÃO DO CLIENTE</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">CARREGAR CLIENTE CADASTRADO</label>
              <select 
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                value={selectedClient?.id || ""}
                onChange={(e) => {
                  const clientId = e.target.value;
                  if (!clientId) {
                    setClientSearch("");
                    setSelectedClient(null);
                    setClientPhone("");
                    setClientDoc("");
                    setClientEmail("");
                    setClientCep("");
                    setClientStreet("");
                    setClientNumber("");
                    setClientComplement("");
                    setClientNeighborhood("");
                    setClientCity("");
                    setClientUf("");
                    return;
                  }
                  const client = clients.find(c => String(c.id) === clientId);
                  if (client) {
                    setClientSearch(client.name);
                    setSelectedClient(client);
                    setClientPhone(client.whatsapp || "");
                    setClientDoc(client.document || "");
                    setClientEmail(client.email || "");
                    setClientCep(client.cep || "");
                    setClientStreet(client.street || "");
                    setClientNumber(client.number || "");
                    setClientComplement(client.complement || "");
                    setClientNeighborhood(client.neighborhood || "");
                    setClientCity(client.city || "");
                    setClientUf(client.uf || "");
                  }
                }}
              >
                <option value="">Selecione um cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">NOME DO CLIENTE / EMPRESA</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Nome..." 
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(capitalizeFirst(e.target.value));
                    const found = clients.find(c => c.name.toLowerCase() === e.target.value.toLowerCase() || c.document === e.target.value);
                    if (found) {
                      setSelectedClient(found);
                      setClientPhone(found.whatsapp || "");
                      setClientDoc(found.document || "");
                      setClientEmail(found.email || "");
                      setClientCep(found.cep || "");
                      setClientStreet(found.street || "");
                      setClientNumber(found.number || "");
                      setClientComplement(found.complement || "");
                      setClientNeighborhood(found.neighborhood || "");
                      setClientCity(found.city || "");
                      setClientUf(found.uf || "");
                    } else {
                      setSelectedClient(null);
                    }
                  }}
                />
                {clientSearch && clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).length > 0 && !selectedClient && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto">
                    {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(client => (
                      <div 
                        key={client.id}
                        className="px-4 py-2 text-sm hover:bg-secondary/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setClientSearch(client.name);
                          setSelectedClient(client);
                          setClientPhone(client.whatsapp || "");
                          setClientDoc(client.document || "");
                          setClientEmail(client.email || "");
                          setClientCep(client.cep || "");
                          setClientStreet(client.street || "");
                          setClientNumber(client.number || "");
                          setClientComplement(client.complement || "");
                          setClientNeighborhood(client.neighborhood || "");
                          setClientCity(client.city || "");
                          setClientUf(client.uf || "");
                        }}
                      >
                        {client.name} {client.document ? `(${client.document})` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">WHATSAPP</label>
                <input 
                  type="text" 
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value.replace(/\D/g, "").replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3"))}
                  maxLength={15}
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">CPF / CNPJ</label>
                <input 
                  type="text" 
                  value={clientDoc}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    if (v.length <= 11) {
                      setClientDoc(v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"));
                    } else {
                      setClientDoc(v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5"));
                    }
                  }}
                  maxLength={18}
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">CEP</label>
                <input 
                  type="text" 
                  value={clientCep}
                  onChange={(e) => {
                    const formatted = e.target.value.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2");
                    setClientCep(formatted);
                    const digits = e.target.value.replace(/\D/g, '');
                    if (digits.length === 8) {
                      fetch(`/api/cep/${digits}`)
                        .then(res => res.json())
                        .then(data => {
                          if (!data.erro && !data.error) {
                            setClientStreet(data.logradouro || '');
                            setClientNeighborhood(data.bairro || '');
                            setClientCity(data.localidade || '');
                            setClientUf(data.uf || '');
                          }
                        })
                        .catch(err => console.error("Erro ao buscar CEP:", err));
                    }
                  }}
                  onBlur={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    if (digits.length === 8) {
                      fetch(`/api/cep/${digits}`)
                        .then(res => res.json())
                        .then(data => {
                          if (!data.erro && !data.error) {
                            setClientStreet(data.logradouro || '');
                            setClientNeighborhood(data.bairro || '');
                            setClientCity(data.localidade || '');
                            setClientUf(data.uf || '');
                          }
                        })
                        .catch(err => console.error("Erro ao buscar CEP:", err));
                    }
                  }}
                  maxLength={9}
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Rua / Logradouro</label>
                <input 
                  type="text" 
                  value={clientStreet}
                  onChange={(e) => setClientStreet(e.target.value)}
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Nº</label>
                <input 
                  type="text" 
                  value={clientNumber}
                  onChange={(e) => setClientNumber(e.target.value)}
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Complemento</label>
                <input 
                  type="text" 
                  value={clientComplement}
                  onChange={(e) => setClientComplement(e.target.value)}
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Bairro</label>
                <input 
                  type="text" 
                  value={clientNeighborhood}
                  onChange={(e) => setClientNeighborhood(e.target.value)}
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Cidade</label>
                <input 
                  type="text" 
                  value={clientCity}
                  onChange={(e) => setClientCity(e.target.value)}
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">UF</label>
                <input 
                  type="text" 
                  value={clientUf}
                  onChange={(e) => setClientUf(e.target.value.toUpperCase())}
                  maxLength={2}
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-center uppercase" 
                />
              </div>
            </div>
            
            <div className="flex gap-2 w-full mt-2">
              <button 
                onClick={handleClear}
                className="flex-1 flex items-center justify-center gap-2 bg-secondary/30 hover:bg-secondary/50 text-foreground py-3 rounded-xl transition-colors border border-border/50 text-sm font-semibold"
              >
                <RotateCcw className="w-4 h-4" />
                LIMPAR CALCULADORA
              </button>
              <button 
                onClick={handleSaveClient}
                className="flex-1 flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary py-3 rounded-xl transition-colors border border-primary/30 text-sm font-semibold"
              >
                <Save className="w-4 h-4" />
                SALVAR CLIENTE
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Costs */}
        <div className="bg-card p-6 rounded-2xl border border-card-border shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4"></div>

          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">PREÇO SUGERIDO (TOTAL)</h2>
              <div className="text-4xl font-display font-bold text-[#ffc107]">{formatCurrency(finalLotPrice)}</div>
            </div>
            <div className="text-right">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">UNITÁRIO IMPRESSÃO</h2>
              <div className="text-2xl font-display font-bold text-[#ffc107] opacity-80">{formatCurrency(unitPrice)}</div>
            </div>
          </div>

          <div className="flex-1">
            {isAdmin ? (
              <>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">COMPOSIÇÃO DE CUSTOS CORB3D</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <div className="flex items-center">
                      <div className="w-1.5 h-4 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-muted-foreground">MATERIAL FILAMENTO</span>
                    </div>
                    <span className="font-mono">{formatCurrency(materialCost)} ({(materialCost/totalCost * 100 || 0).toFixed(0)}%)</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <div className="flex items-center">
                      <div className="w-1.5 h-4 bg-yellow-500 rounded-full mr-2"></div>
                      <span className="text-muted-foreground">ENERGIA ELÉTRICA</span>
                    </div>
                    <span className="font-mono">{formatCurrency(energyCost)} ({(energyCost/totalCost * 100 || 0).toFixed(0)}%)</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <div className="flex items-center">
                      <div className="w-1.5 h-4 bg-purple-500 rounded-full mr-2"></div>
                      <span className="text-muted-foreground">DEPRECIAÇÃO MÁQUINA</span>
                    </div>
                    <span className="font-mono">{formatCurrency(depreciationCost)} ({(depreciationCost/totalCost * 100 || 0).toFixed(0)}%)</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <div className="flex items-center">
                      <div className="w-1.5 h-4 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-muted-foreground">MÃO DE OBRA CORB3D</span>
                    </div>
                    <span className="font-mono">{formatCurrency(laborCost)} ({(laborCost/totalCost * 100 || 0).toFixed(0)}%)</span>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <div className="flex justify-between items-center text-[#ff6b6b] font-semibold">
                    <span>Custo Total Produção</span>
                    <span>{formatCurrency(totalCost)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#50c878] font-semibold">
                    <span>Lucro Planejado ({effectiveMargin}%){editingCalculationId && overrideMargin != null && overrideMargin !== settings.profitMargin ? ' (margem original)' : ''}</span>
                    <span>{formatCurrency(profitValue)}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">RESUMO DO ORÇAMENTO</h3>
                
                <div className="space-y-3 text-sm">
                  {projectItems.map((item, index) => {
                    const itemMat = item.materialId ? (stockItems.find(s => s.id === item.materialId)?.cost || 0) : 0;
                    const itemWeight = (item.weight || 0) / 1000;
                    const itemHours = (item.hours || 0) + ((item.minutes || 0) / 60);
                    const itemCostCalc = (itemMat * itemWeight) + (itemHours * (energyCostPerHour + depreciationPerHour + settings.laborCostPerHour));
                    const itemSellPrice = round2(itemCostCalc * (1 + profitMargin));
                    const itemQty = item.qty || 1;
                    return (
                      <div key={item.id} className="flex justify-between items-center border-b border-border/50 pb-2">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="w-1.5 h-4 bg-[#ffc107] rounded-full mr-2 shrink-0"></div>
                          <span className="text-muted-foreground truncate">{item.description || `Item ${index + 1}`}</span>
                          <span className="text-muted-foreground/60 ml-1 shrink-0">x{itemQty}</span>
                        </div>
                        <span className="font-mono ml-2 shrink-0">{formatCurrency(itemSellPrice * itemQty)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 space-y-2">
                  <div className="flex justify-between items-center text-muted-foreground text-sm">
                    <span>Quantidade Total</span>
                    <span className="font-mono">{totalQty} {totalQty === 1 ? 'unidade' : 'unidades'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#ffc107] font-semibold text-lg border-t border-border/50 pt-2">
                    <span>Valor Total</span>
                    <span>{formatCurrency(finalLotPrice)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3 mt-8">
            <button onClick={handleSave} className="flex flex-col items-center justify-center gap-1.5 bg-secondary/50 hover:bg-secondary text-foreground py-3 rounded-xl transition-colors border border-border/50">
              <Save className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{editingCalculationId ? 'ATUALIZAR' : 'SALVAR'}</span>
            </button>
            <button onClick={() => setShowPdfPreview(true)} className="flex flex-col items-center justify-center gap-1.5 bg-secondary/50 hover:bg-secondary text-foreground py-3 rounded-xl transition-colors border border-border/50">
              <FileText className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">PDF</span>
            </button>
            <button onClick={() => setShowPdfPreview(true)} className="flex flex-col items-center justify-center gap-1.5 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] py-3 rounded-xl transition-colors border border-[#25D366]/30">
              <Phone className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">WHATSAPP</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Project Details */}
      <div className="bg-card p-6 rounded-2xl border border-card-border shadow-sm mb-8">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">DETALHES DA IMPRESSÃO & PROJETO</h2>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">NOME DO PROJETO</label>
              <input 
                type="text" 
                placeholder="Nome do Projeto..." 
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={projectName}
                onChange={(e) => setProjectName(capitalizeFirst(e.target.value))}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#50c878] mb-1.5 block uppercase tracking-wider">ENTREGA</label>
              <input 
                type="text" 
                placeholder="Ex: 2 dias"
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#50c878]/50"
                value={delivery}
                onChange={(e) => setDelivery(capitalizeFirst(e.target.value))}
              />
            </div>
            {employees.length > 0 && (
              <div>
                <label className="text-[10px] font-semibold text-[#50c878] mb-1.5 block uppercase tracking-wider">VENDEDOR</label>
                {isAdmin ? (
                  <select
                    data-testid="select-employee"
                    className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#50c878]/50"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  >
                    <option value="">Selecione o vendedor</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.commissionRate}%)</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-foreground">
                    {employees.find(e => e.linkedUserId === currentUserId)?.name || 'Vendedor não vinculado'}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* ITENS DO PROJETO */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-semibold text-muted-foreground">ITENS ADICIONAIS / DESCRIÇÃO</label>
              <button 
                onClick={addProjectItem}
                className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 transition-colors bg-primary/10 px-3 py-1.5 rounded-lg font-medium"
              >
                <Plus className="w-3 h-3" /> Adicionar Item
              </button>
            </div>
            
            <div className="space-y-3">
              {projectItems.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl bg-card">
                  Nenhum item adicional. Clique no botão acima para adicionar peças extras, pintura, acabamento, etc.
                </div>
              )}
              {projectItems.map((item, index) => (
                <div key={item.id} className="flex flex-col gap-3 bg-secondary/5 p-3 rounded-xl border border-border/50">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      {index === 0 && <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block pl-1">DESCRIÇÃO</label>}
                      <input 
                        type="text" 
                        placeholder="Descrição..." 
                        className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                        value={item.description}
                        onChange={(e) => updateProjectItem(item.id, 'description', capitalizeFirst(e.target.value))}
                      />
                    </div>
                  </div>
                  
                    <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[120px]">
                      {index === 0 && <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block pl-1">MATERIAL</label>}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <select 
                            className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none h-[38px]"
                            value={item.materialId || ''}
                            onChange={(e) => updateProjectItem(item.id, 'materialId', e.target.value)}
                          >
                            <option value="">Selecione...</option>
                            {stockItems.map(s => {
                              const matName = inventory.find(m => m.id === s.materialId)?.name || 'Desconhecido';
                              return (
                                <option key={s.id} value={s.id}>{matName} - {s.brand} ({s.color})</option>
                              );
                            })}
                          </select>
                          <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-16 sm:w-20">
                      {index === 0 && <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block text-center">PESO (g)</label>}
                      <input 
                        type="text" 
                        maxLength={4}
                        className="w-full bg-input border border-border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/50 h-[38px]"
                        value={item.weight || ''}
                        onChange={(e) => updateProjectItem(item.id, 'weight', Number(e.target.value.replace(/\D/g, '').slice(0, 4)))}
                      />
                    </div>
                    
                    <div className="w-24">
                      {index === 0 && <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block text-center">TEMPO</label>}
                      <div className="flex items-center justify-center bg-input border border-border rounded-lg focus-within:ring-1 focus-within:ring-primary/50 overflow-hidden h-[38px]">
                        <input 
                          type="text" 
                          maxLength={2}
                          className="w-8 text-center bg-transparent outline-none text-sm px-0"
                          placeholder="HH"
                          value={item.hours !== undefined && item.hours !== 0 ? item.hours : item.hours === 0 ? '0' : ''}
                          onChange={(e) => updateProjectItem(item.id, 'hours', e.target.value === '' ? 0 : Number(e.target.value.replace(/\D/g, '').slice(0, 2)))}
                        />
                        <span className="text-muted-foreground font-bold text-xs">:</span>
                        <input 
                          type="text" 
                          maxLength={2}
                          className="w-8 text-center bg-transparent outline-none text-sm px-0"
                          placeholder="MM"
                          value={item.minutes !== undefined && item.minutes !== 0 ? item.minutes : item.minutes === 0 ? '0' : ''}
                          onChange={(e) => updateProjectItem(item.id, 'minutes', e.target.value === '' ? 0 : Number(e.target.value.replace(/\D/g, '').slice(0, 2)))}
                        />
                      </div>
                    </div>

                    <div className="w-14">
                      {index === 0 && <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block text-center">QTD</label>}
                      <input 
                        type="number" 
                        min="1"
                        placeholder="Qtd" 
                        className="w-full bg-input border border-border rounded-lg px-1 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/50 h-[38px]"
                        value={item.qty || ''}
                        onChange={(e) => updateProjectItem(item.id, 'qty', Number(e.target.value))}
                      />
                    </div>
                    
                    {item.materialId && (
                      <div className="w-24">
                        {index === 0 && <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block text-right pr-1">CUSTO MAT.</label>}
                        <div className="bg-input/50 border border-border rounded-lg px-2 py-2 text-[11px] font-medium text-muted-foreground flex items-center justify-end h-[38px] whitespace-nowrap" title="Custo do Filamento Utilizado">
                          {formatCurrency((stockItems.find(s => s.id === item.materialId)?.cost || 0) * ((item.weight || 0) / 1000) * (item.qty || 1))}
                        </div>
                      </div>
                    )}
                    
                    <div className="w-24">
                      {index === 0 && <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block text-right pr-1">TOTAL</label>}
                      <div className="bg-input/80 border border-border rounded-lg px-2 py-2 text-sm text-right text-foreground flex items-center justify-end font-mono h-[38px]" title="Valor de Venda (com lucro)">
                        {formatCurrency(
                          round2(((((item.materialId ? (stockItems.find(s => s.id === item.materialId)?.cost || 0) : 0) * ((item.weight || 0) / 1000)) + 
                          (((item.hours || 0) + ((item.minutes || 0) / 60)) * (energyCostPerHour + depreciationPerHour + settings.laborCostPerHour))) * (1 + profitMargin)) * (item.qty || 1))
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => removeProjectItem(item.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-lg border border-transparent h-[38px]"
                      title="Remover Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {projectItems.length > 0 && (
                <div className="text-right text-sm font-semibold text-primary pr-12 pt-2">
                  Total Itens: {formatCurrency(finalLotPrice)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative bg-white text-black w-full max-w-[800px] sm:rounded-sm rounded-none shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            
            {/* Modal Controls */}
            <div className="absolute top-4 right-4 flex gap-2 no-print z-10">
              <button 
                onClick={() => setShowPdfPreview(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded-full transition-colors shadow-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-sm">
              <h2 className="text-lg font-bold text-gray-800">Preview do Orçamento</h2>
              <div className="flex gap-3">
                <button 
                  onClick={handleWhatsApp}
                  disabled={isGeneratingPdf}
                  className="flex items-center gap-2 bg-[#25D366] text-white px-6 py-2 rounded-md font-semibold hover:bg-[#25D366]/90 transition-colors shadow-md disabled:opacity-50"
                >
                  {isGeneratingPdf ? 'Aguarde...' : <><Phone className="w-4 h-4" /> Enviar WhatsApp</>}
                </button>
                <button 
                  onClick={handleGeneratePdf}
                  disabled={isGeneratingPdf}
                  className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-md font-semibold hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50"
                >
                  {isGeneratingPdf ? 'Gerando...' : <><Download className="w-4 h-4" /> Salvar PDF</>}
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="overflow-auto p-8" style={{ maxHeight: 'calc(100vh - 120px)' }}>
              <div ref={pdfRef} className="bg-white text-gray-900 p-10 mx-auto print-area" style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
                
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
                  <div>
                    {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="Logo" className="h-[88px] w-auto object-contain" />
                    ) : (
                      <>
                        <h1 className="text-4xl font-black tracking-tighter text-gray-900">Corb3D</h1>
                        <p className="text-sm text-gray-500 uppercase tracking-widest mt-1">Manager 1.0 - Serviços de Impressão 3D</p>
                      </>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p className="font-bold text-gray-800 text-lg mb-1">ORÇAMENTO</p>
                    <p>Data: {format(new Date(), 'dd/MM/yyyy')}</p>
                    <p>Validade: 15 dias</p>
                  </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Dados do Cliente</h3>
                    <p className="font-bold text-gray-800 text-xs mb-0.5">{clientSearch || "Cliente Não Identificado"}</p>
                    {clientDoc && <p className="text-[10px] text-gray-600">Doc: {clientDoc}</p>}
                    {clientPhone && <p className="text-[10px] text-gray-600">WhatsApp: {clientPhone}</p>}
                    {clientEmail && <p className="text-[10px] text-gray-600">E-mail: {clientEmail}</p>}
                    {clientStreet && <p className="text-[10px] text-gray-600">Endereço: {clientStreet}{clientNumber ? `, ${clientNumber}` : ''}{clientComplement ? ` - ${clientComplement}` : ''}{clientNeighborhood ? ` - ${clientNeighborhood}` : ''}</p>}
                    {clientCity && <p className="text-[10px] text-gray-600">Cidade: {clientCity}{clientUf ? `/${clientUf}` : ''}</p>}
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Dados do Projeto</h3>
                    <p className="font-bold text-gray-800 text-xs mb-0.5">{projectName || "Projeto sem nome"}</p>
                    <p className="text-[10px] text-gray-600">Material Base: {
                      (() => {
                        const s = stockItems.find(st => st.id === materialId);
                        const m = s ? inventory.find(i => i.id === s.materialId) : null;
                        return m ? `${m.name} - ${s?.brand} (${s?.color})` : 'Não especificado';
                      })()
                    }</p>
                    <p className="text-[10px] text-gray-600">Prazo Estimado: {delivery || 'A combinar'}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-2 border-b border-gray-300 pb-1">Itens do Orçamento</h3>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600 uppercase text-[10px]">
                        <th className="py-2 px-3 text-left font-bold">Descrição</th>
                        <th className="py-2 px-3 text-center font-bold">Qtd</th>
                        <th className="py-2 px-3 text-right font-bold">V. Unitário</th>
                        <th className="py-2 px-3 text-right font-bold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {projectItems.map((item, index) => {
                        const itemMaterialCost = (item.materialId ? (stockItems.find(s => s.id === item.materialId)?.cost || 0) : 0) * ((item.weight || 0) / 1000);
                        const itemHours = (item.hours || 0) + ((item.minutes || 0) / 60);
                        const itemEnergyCost = itemHours * energyCostPerHour;
                        const itemDeprCost = itemHours * depreciationPerHour;
                        const itemLaborCost = itemHours * settings.laborCostPerHour;
                        const itemOperationCost = itemEnergyCost + itemDeprCost + itemLaborCost;
                        const itemTotalCost = itemMaterialCost + itemOperationCost;
                        const itemExactPrice = itemTotalCost * (1 + profitMargin);
                        const unitPriceDisplay = round2(itemExactPrice);
                        const lineTotalDisplay = round2(itemExactPrice * (item.qty || 1));
                        
                        return (
                          <tr key={item.id}>
                            <td className="py-2 px-3 text-gray-800">
                              <p className="font-semibold text-xs">{item.description || `Item ${index + 1}`}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">Material: {
                                (() => {
                                  const s = stockItems.find(st => st.id === item.materialId);
                                  const m = s ? inventory.find(i => i.id === s.materialId) : null;
                                  return m ? `${m.name} - ${s?.brand} (${s?.color})` : 'N/A';
                                })()
                              }</p>
                            </td>
                            <td className="py-2 px-3 text-center font-medium">{item.qty || 1}</td>
                            <td className="py-2 px-3 text-right text-gray-600">{formatCurrency(unitPriceDisplay)}</td>
                            <td className="py-2 px-3 text-right font-semibold text-gray-800">{formatCurrency(lineTotalDisplay)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="flex justify-end">
                  <div className="w-1/2 bg-gray-50 p-3 rounded-md border border-gray-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600">Subtotal Itens:</span>
                      <span className="text-xs font-medium">{formatCurrency(finalLotPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-gray-300">
                      <span className="text-sm font-bold text-gray-800">TOTAL GERAL:</span>
                      <span className="text-base font-black text-gray-900">{formatCurrency(finalLotPrice)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-16 text-center text-xs text-gray-400 border-t border-gray-200 pt-8">
                  <p>Orçamento gerado pelo sistema Corb3D Manager 1.0.</p>
                  <p>Dúvidas? Entre em contato pelo nosso WhatsApp.</p>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
