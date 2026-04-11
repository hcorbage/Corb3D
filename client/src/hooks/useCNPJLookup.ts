import { useState } from "react";
import { validateCNPJ } from "@shared/validators";
import { fetchCNPJ } from "@/lib/cnpj";

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
  hint: string;
  filled: string[];
  data: CNPJData | null;
};

const FRIENDLY_MSG = "Não foi possível consultar o CNPJ no momento. Você pode preencher os dados manualmente.";

export function useCNPJLookup() {
  const [state, setState] = useState<CNPJLookupState>({
    loading: false,
    hint: "",
    filled: [],
    data: null,
  });

  const reset = () => setState({ loading: false, hint: "", filled: [], data: null });

  const lookup = async (
    raw: string,
    onSuccess: (data: CNPJData) => string[]
  ) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 14 || !validateCNPJ(digits)) return;

    setState(s => ({ ...s, loading: true, hint: "", filled: [] }));
    try {
      const data = await fetchCNPJ(digits);
      if (!data) {
        setState({ loading: false, hint: FRIENDLY_MSG, filled: [], data: null });
        return;
      }
      const filledFields = onSuccess(data);
      setState({ loading: false, hint: "", filled: filledFields, data });
    } catch {
      setState({ loading: false, hint: FRIENDLY_MSG, filled: [], data: null });
    }
  };

  return { ...state, error: state.hint, lookup, reset };
}
