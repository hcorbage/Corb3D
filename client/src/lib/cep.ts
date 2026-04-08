export interface CepResult {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

export async function fetchCEP(cep: string): Promise<CepResult | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  try {
    const res = await fetchWithTimeout(`https://viacep.com.br/ws/${digits}/json/`, 8000);
    if (res.ok) {
      const data = await res.json();
      if (data && !data.erro) {
        return {
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          localidade: data.localidade || '',
          uf: data.uf || '',
        };
      }
    }
  } catch {}

  try {
    const res2 = await fetchWithTimeout(`https://brasilapi.com.br/api/cep/v1/${digits}`, 8000);
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && data2.cep) {
        return {
          logradouro: data2.street || '',
          bairro: data2.neighborhood || '',
          localidade: data2.city || '',
          uf: data2.state || '',
        };
      }
    }
  } catch {}

  return null;
}
