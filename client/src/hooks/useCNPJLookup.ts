import { useState } from "react";
import { validateCNPJ } from "@shared/validators";

export type CNPJData = {
  name: string;
  tradeName: string;
  email: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  uf: string;
  status: string;
  active: boolean;
};

export type CNPJLookupState = {
  loading: boolean;
  error: string;
  filled: string[];
  data: CNPJData | null;
};

export function useCNPJLookup() {
  const [state, setState] = useState<CNPJLookupState>({
    loading: false,
    error: "",
    filled: [],
    data: null,
  });

  const reset = () => setState({ loading: false, error: "", filled: [], data: null });

  const lookup = async (
    raw: string,
    onSuccess: (data: CNPJData) => string[]
  ) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 14 || !validateCNPJ(digits)) return;

    setState(s => ({ ...s, loading: true, error: "", filled: [] }));
    try {
      const res = await fetch(`/api/cnpj/${digits}`);
      const data = await res.json();
      if (!res.ok) {
        setState({ loading: false, error: data.message || "Erro ao consultar CNPJ.", filled: [], data: null });
        return;
      }
      const filledFields = onSuccess(data as CNPJData);
      setState({ loading: false, error: "", filled: filledFields, data: data as CNPJData });
    } catch {
      setState({ loading: false, error: "Erro de conexão. Verifique sua internet.", filled: [], data: null });
    }
  };

  return { ...state, lookup, reset };
}
