export interface CepResult {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

export async function fetchCEP(cep: string): Promise<CepResult | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.street !== undefined) {
        return {
          logradouro: data.street || '',
          bairro: data.neighborhood || '',
          localidade: data.city || '',
          uf: data.state || '',
        };
      }
    }
  } catch {}

  try {
    const res2 = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && !data2.erro) {
        return {
          logradouro: data2.logradouro || '',
          bairro: data2.bairro || '',
          localidade: data2.localidade || '',
          uf: data2.uf || '',
        };
      }
    }
  } catch {}

  return null;
}
