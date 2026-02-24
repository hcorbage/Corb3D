import { useState } from "react";
import { useAppState, Client } from "../context/AppState";
import { UserPlus, Trash2, Edit2, Search, X, Check, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const clientSchema = z.object({
  name: z.string().min(3, "Nome é obrigatório"),
  document: z.string().min(14, "Documento inválido"), // CPF or CNPJ
  email: z.string().email("E-mail inválido").or(z.literal('')),
  whatsapp: z.string().min(14, "WhatsApp inválido").or(z.literal('')),
  cep: z.string().min(9, "CEP inválido").or(z.literal('')),
  street: z.string(),
  number: z.string(),
  complement: z.string(),
  neighborhood: z.string(),
  city: z.string(),
  uf: z.string().max(2),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function Clients() {
  const { clients, addClient, updateClient, deleteClient } = useAppState();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "", document: "", email: "", whatsapp: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", uf: ""
    }
  });

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.document.includes(searchTerm)
  );

  const formatCPF_CNPJ = (value: string) => {
    const v = value.replace(/\D/g, "");
    if (v.length <= 11) {
      return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else {
      return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
  };

  const formatCEP = (value: string) => {
    return value.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2");
  };

  const formatPhone = (value: string) => {
    return value.replace(/\D/g, "").replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  };

  const handleCEPBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const response = await fetch(`/api/cep/${cep}`);
        const data = await response.json();
        if (!data.erro) {
          setValue("street", data.logradouro);
          setValue("neighborhood", data.bairro);
          setValue("city", data.localidade);
          setValue("uf", data.uf);
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  };

  const openNewClientModal = () => {
    setEditingClient(null);
    reset({ name: "", document: "", email: "", whatsapp: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", uf: "" });
    setIsModalOpen(true);
  };

  const openEditClientModal = (client: Client) => {
    setEditingClient(client);
    reset({
      name: client.name,
      document: client.document,
      email: client.email || "",
      whatsapp: client.whatsapp,
      cep: client.cep,
      street: client.street,
      number: client.number,
      complement: client.complement,
      neighborhood: client.neighborhood,
      city: client.city,
      uf: client.uf,
    });
    setIsModalOpen(true);
  };

  const onSubmit = (data: ClientFormValues) => {
    if (editingClient) {
      updateClient({ ...data, id: editingClient.id } as Client);
      toast({ title: "Sucesso", description: "Cliente atualizado com sucesso." });
    } else {
      // Check for duplicates
      if (clients.some(c => c.document === data.document)) {
        toast({ title: "Erro", description: "Já existe um cliente com este CPF/CNPJ.", variant: "destructive" });
        return;
      }
      addClient(data);
      toast({ title: "Sucesso", description: "Cliente cadastrado com sucesso." });
    }
    setIsModalOpen(false);
  };

  const confirmDelete = (id: string) => {
    setClientToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = () => {
    if (clientToDelete) {
      deleteClient(clientToDelete);
      toast({ title: "Sucesso", description: "Cliente removido." });
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">Clientes</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gerencie o cadastro de clientes.</p>
        </div>
        <button 
          onClick={openNewClientModal}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl transition-colors font-medium shadow-lg shadow-primary/20"
        >
          <UserPlus className="w-5 h-5" />
          Novo Cliente
        </button>
      </div>

      <div className="bg-card p-4 rounded-2xl border border-card-border shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Buscar por nome ou documento..." 
          className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-2xl border border-dashed border-border">
            Nenhum cliente encontrado.
          </div>
        ) : (
          filteredClients.map(client => (
            <div key={client.id} className="bg-card p-5 rounded-2xl border border-card-border shadow-sm hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg leading-tight">{client.name}</h3>
                <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditClientModal(client)} className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10" title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => confirmDelete(client.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10" title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-semibold text-foreground/80">Doc:</span> {client.document || 'N/A'}</p>
                <p><span className="font-semibold text-foreground/80">Wpp:</span> {client.whatsapp || 'N/A'}</p>
                <p className="truncate"><span className="font-semibold text-foreground/80">End:</span> {client.city} - {client.uf}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cadastro/Edição Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nome / Empresa *</label>
                <input {...register("name")} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                {errors.name && <span className="text-[10px] text-destructive">{errors.name.message}</span>}
              </div>
              
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">CPF / CNPJ *</label>
                <input 
                  {...register("document")} 
                  onChange={(e) => setValue("document", formatCPF_CNPJ(e.target.value))}
                  maxLength={18}
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
                {errors.document && <span className="text-[10px] text-destructive">{errors.document.message}</span>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">WhatsApp</label>
                <input 
                  {...register("whatsapp")} 
                  onChange={(e) => setValue("whatsapp", formatPhone(e.target.value))}
                  maxLength={15}
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">E-mail</label>
                <input {...register("email")} type="email" className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                {errors.email && <span className="text-[10px] text-destructive">{errors.email.message}</span>}
              </div>
            </div>

            <div className="border-t border-border/50 pt-4 mt-4">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Endereço</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">CEP</label>
                  <input 
                    {...register("cep")} 
                    onChange={(e) => setValue("cep", formatCEP(e.target.value))}
                    onBlur={handleCEPBlur}
                    maxLength={9}
                    className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Logradouro</label>
                  <input {...register("street")} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Número</label>
                  <input {...register("number")} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Complemento</label>
                  <input {...register("complement")} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Bairro</label>
                  <input {...register("neighborhood")} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Cidade</label>
                  <input {...register("city")} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">UF</label>
                  <input {...register("uf")} maxLength={2} className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase" />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                Cancelar
              </button>
              <button type="submit" className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl transition-colors font-medium">
                <Save className="w-4 h-4" />
                {editingClient ? "Salvar Alterações" : "Cadastrar Cliente"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            Tem certeza que deseja excluir este cliente? Esta ação não poderá ser desfeita.
          </div>
          <DialogFooter>
            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
              Cancelar
            </button>
            <button onClick={executeDelete} className="flex items-center gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-xl transition-colors font-medium">
              <Trash2 className="w-4 h-4" />
              Sim, excluir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
