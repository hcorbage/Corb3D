import { CNPJData } from "@/hooks/useCNPJLookup";

function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

function formatPhone(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return raw.trim();
}

function cleanCEP(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : raw;
}

function mapBrasilAPI(d: Record<string, unknown>): CNPJData {
  return {
    name: (d.razao_social as string) || "",
    tradeName: (d.nome_fantasia as string) || "",
    email: ((d.email as string) || "").toLowerCase(),
    phone: formatPhone((d.ddd_telefone_1 as string) || ""),
    cep: cleanCEP((d.cep as string) || ""),
    street: (d.logradouro as string) || "",
    number: (d.numero as string) || "",
    complement: (d.complemento as string) || "",
    neighborhood: (d.bairro as string) || "",
    city: (d.municipio as string) || "",
    uf: (d.uf as string) || "",
    status: (d.descricao_situacao_cadastral as string) || "",
    active: (d.codigo_situacao_cadastral as number) === 2,
  };
}

function mapMinhaReceita(d: Record<string, unknown>): CNPJData {
  return {
    name: (d.razao_social as string) || "",
    tradeName: (d.nome_fantasia as string) || "",
    email: ((d.email as string) || "").toLowerCase(),
    phone: formatPhone((d.ddd_telefone_1 as string) || ""),
    cep: cleanCEP((d.cep as string) || ""),
    street: (d.logradouro as string) || "",
    number: (d.numero as string) || "",
    complement: (d.complemento as string) || "",
    neighborhood: (d.bairro as string) || "",
    city: (d.municipio as string) || "",
    uf: (d.uf as string) || "",
    status: (d.descricao_situacao_cadastral as string) || (d.situacao_cadastral as string) || "",
    active: (d.situacao_cadastral as string) === "ATIVA" || (d.codigo_situacao_cadastral as number) === 2,
  };
}

export async function fetchCNPJ(cnpj: string): Promise<CNPJData | null> {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return null;

  // Primary: BrasilAPI (browser-direct, bypasses server)
  try {
    const res = await fetchWithTimeout(
      `https://brasilapi.com.br/api/cnpj/v1/${digits}`,
      10000
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.razao_social) return mapBrasilAPI(data);
    }
  } catch {}

  // Fallback: Minha Receita (alternative free API)
  try {
    const res2 = await fetchWithTimeout(
      `https://minhareceita.org/${digits}`,
      10000
    );
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && data2.razao_social) return mapMinhaReceita(data2);
    }
  } catch {}

  return null;
}
