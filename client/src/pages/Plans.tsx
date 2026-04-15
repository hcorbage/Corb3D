import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Check, Sparkles, Zap, Clock, ExternalLink, AlertCircle, Crown } from "lucide-react";

interface PlanDefinition {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
}

type PlansMap = Record<string, PlanDefinition>;

const FEATURES_BY_PLAN: Record<string, string[]> = {
  teste: [
    "Plano exclusivo para validação da integração",
    "Duração: 1 dia",
  ],
  trial: [
    "Calculadora de orçamentos",
    "Gestão de clientes",
    "Controle de estoque",
    "Histórico de orçamentos",
    "Duração: 7 dias",
  ],
  basic: [
    "Tudo do Trial",
    "Acesso completo sem limite de tempo",
    "Módulo financeiro completo",
    "Caixa diário e fluxo de caixa",
    "Relatórios e comissões",
    "Suporte via WhatsApp",
  ],
  pro: [
    "Tudo do Plano Basic",
    "Múltiplos funcionários",
    "Controle de permissões por módulo",
    "Impressoras personalizadas",
    "Backup automático dos dados",
    "Suporte prioritário",
  ],
};

const PLAN_LABELS: Record<string, string> = {
  teste: "Teste",
  trial: "Trial",
  basic: "Basic",
  pro: "Pro",
};

function PlanBadge({ plan }: { plan: string }) {
  const labels: Record<string, { label: string; cls: string }> = {
    teste: { label: "Teste ativo", cls: "bg-orange-100 text-orange-700 border-orange-200" },
    trial: { label: "Em teste", cls: "bg-gray-100 text-gray-600 border-gray-200" },
    basic: { label: "Basic ativo", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    pro: { label: "Pro ativo", cls: "bg-violet-100 text-violet-700 border-violet-200" },
  };
  const b = labels[plan] ?? labels.trial;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${b.cls}`}>
      <Crown className="w-3 h-3" /> {b.label}
    </span>
  );
}

export default function Plans() {
  const auth = useAuth();
  const [plans, setPlans] = useState<PlansMap>({});
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = auth.plan ?? "trial";
  const isActive = auth.subscriptionStatus === "active";
  const expiresAt = auth.subscriptionExpiresAt;

  useEffect(() => {
    fetch("/api/payments/plans")
      .then((r) => r.json())
      .then((data) => { setPlans(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubscribe(planId: string) {
    setError(null);
    setSubscribing(planId);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Erro ao criar preferência de pagamento.");
        return;
      }
      const url = data.checkoutUrl;
      if (!url) {
        setError("Link de pagamento não disponível. Tente novamente.");
        return;
      }
      window.location.href = url;
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setSubscribing(null);
    }
  }

  const cardConfigs = [
    {
      id: "teste",
      icon: Zap,
      iconColor: "text-orange-500",
      iconBg: "bg-orange-50",
      badge: "Apenas R$1",
      borderClass: "border-orange-300 border-dashed",
      headerBg: "bg-orange-50",
      priceColor: "text-orange-600",
      buttonClass: "bg-orange-500 hover:bg-orange-600 text-white shadow-sm hover:shadow-md",
      buttonLabel: "Testar integração",
      buttonDisabled: false,
    },
    {
      id: "trial",
      icon: Clock,
      iconColor: "text-gray-400",
      iconBg: "bg-gray-50",
      badge: null,
      borderClass: "border-gray-200",
      headerBg: "bg-gray-50",
      priceColor: "text-gray-700",
      buttonClass: "bg-gray-100 text-gray-400 cursor-not-allowed",
      buttonLabel: "Período de teste",
      buttonDisabled: true,
    },
    {
      id: "basic",
      icon: Zap,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      badge: "Recomendado",
      borderClass: "border-blue-400 ring-2 ring-blue-100",
      headerBg: "bg-blue-50",
      priceColor: "text-blue-700",
      buttonClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md",
      buttonLabel: "Assinar Basic",
      buttonDisabled: false,
    },
    {
      id: "pro",
      icon: Sparkles,
      iconColor: "text-violet-600",
      iconBg: "bg-violet-50",
      badge: "Premium",
      borderClass: "border-violet-300",
      headerBg: "bg-violet-50",
      priceColor: "text-violet-700",
      buttonClass: "bg-violet-600 hover:bg-violet-700 text-white shadow-sm hover:shadow-md",
      buttonLabel: "Assinar Pro",
      buttonDisabled: false,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Planos e Preços</h1>
        <p className="text-muted-foreground text-base max-w-xl mx-auto">
          Escolha o plano ideal para o seu negócio de impressão 3D. Cancele a qualquer momento.
        </p>

        {/* Status atual */}
        {currentPlan && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm text-muted-foreground">
            Seu plano atual: <PlanBadge plan={currentPlan} />
            {isActive && expiresAt && (
              <span className="text-xs text-muted-foreground">
                · válido até {new Date(expiresAt).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          data-testid="payment-error"
          className="mb-6 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardConfigs.map((cfg) => {
          const planData = plans[cfg.id];
          const Icon = cfg.icon;
          const isCurrent = currentPlan === cfg.id;
          const isLoading = subscribing === cfg.id;
          const isThisActive = isCurrent && isActive;

          const price =
            cfg.id === "trial"
              ? null
              : planData
                ? planData.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                : loading
                  ? "..."
                  : "—";

          const features = FEATURES_BY_PLAN[cfg.id] ?? [];

          let buttonLabel = cfg.buttonLabel;
          let buttonDisabled = cfg.buttonDisabled;
          if (isCurrent && isActive) {
            buttonLabel = "Plano ativo";
            buttonDisabled = true;
          } else if (isCurrent && cfg.id === "trial") {
            buttonLabel = "Plano atual";
            buttonDisabled = true;
          }

          return (
            <div
              key={cfg.id}
              data-testid={`plan-card-${cfg.id}`}
              className={`relative flex flex-col rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md ${cfg.borderClass}`}
            >
              {/* Badge topo */}
              {cfg.badge && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                    cfg.id === "basic"
                      ? "bg-blue-600 text-white"
                      : "bg-violet-600 text-white"
                  }`}>
                    {cfg.badge}
                  </span>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold shadow-sm bg-green-600 text-white">
                    Plano atual
                  </span>
                </div>
              )}

              {/* Header */}
              <div className={`px-6 pt-8 pb-5 rounded-t-2xl ${cfg.headerBg}`}>
                <div className={`w-11 h-11 rounded-xl ${cfg.iconBg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-6 h-6 ${cfg.iconColor}`} />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">
                  {PLAN_LABELS[cfg.id] ?? cfg.id}
                </h2>
                {price !== null ? (
                  <div className="flex items-end gap-1">
                    <span className={`text-3xl font-extrabold ${cfg.priceColor}`}>{price}</span>
                    <span className="text-muted-foreground text-sm mb-1">/mês</span>
                  </div>
                ) : (
                  <div className="flex items-end gap-1">
                    <span className={`text-3xl font-extrabold ${cfg.priceColor}`}>Grátis</span>
                    <span className="text-muted-foreground text-sm mb-1">· 7 dias</span>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="px-6 py-5 flex-1">
                <ul className="space-y-2.5">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        cfg.id === "basic" ? "text-blue-500"
                          : cfg.id === "pro" ? "text-violet-500"
                            : "text-gray-400"
                      }`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Button */}
              <div className="px-6 pb-6">
                <button
                  data-testid={`button-subscribe-${cfg.id}`}
                  disabled={buttonDisabled || isLoading || (isThisActive)}
                  onClick={() => !buttonDisabled && !isLoading && handleSubscribe(cfg.id)}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                    buttonDisabled || isThisActive
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : cfg.buttonClass
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Redirecionando...
                    </>
                  ) : (
                    <>
                      {!buttonDisabled && <ExternalLink className="w-4 h-4" />}
                      {buttonLabel}
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      <p className="text-center text-xs text-muted-foreground mt-8">
        Pagamento seguro via <span className="font-medium">Mercado Pago</span> · PIX, cartão de crédito e boleto disponíveis.
      </p>
    </div>
  );
}
