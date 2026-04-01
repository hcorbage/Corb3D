export const PERMISSION_MODULES = [
  { key: "calculadora", label: "Calculadora" },
  { key: "historico", label: "Histórico" },
  { key: "estoque", label: "Estoque" },
  { key: "clientes", label: "Clientes" },
  { key: "financeiro", label: "Visão Geral Financeira" },
  { key: "pedidos_financeiro", label: "Financeiro por Pedido" },
  { key: "caixa_diario", label: "Caixa Diário" },
  { key: "livro_caixa", label: "Livro Caixa" },
  { key: "comissoes", label: "Comissões" },
  { key: "relatorio_clientes", label: "Rel. Clientes" },
  { key: "relatorios", label: "Relatórios" },
] as const;

export type PermissionModule = typeof PERMISSION_MODULES[number]["key"];

export const DEFAULT_EMPLOYEE_PERMISSIONS: PermissionModule[] = [
  "calculadora",
  "historico",
  "comissoes",
];
