import { useState, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AppStateProvider } from "./context/AppState";
import { AuthContext, useAuth, buildAuthContext, type AuthUser } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Layout } from "./components/Layout";
import Calculator from "./pages/Calculator";
import Inventory from "./pages/Inventory";
import Clients from "./pages/Clients";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Commissions from "./pages/Commissions";
import CashBook from "./pages/CashBook";
import FinanceiroDashboard from "./pages/FinanceiroDashboard";
import PedidosFinanceiro from "./pages/PedidosFinanceiro";
import CaixaDiario from "./pages/CaixaDiario";
import Relatorios from "./pages/Relatorios";
import RelatorioClientes from "./pages/RelatorioClientes";
import Login from "./pages/Login";
import { Lock, Eye, EyeOff, KeyRound, Clock, MessageCircle, AlertTriangle, FileText, ShieldCheck, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import TermsOfUse from "@/pages/TermsOfUse";
import PrivacyPolicy from "@/pages/PrivacyPolicy";

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Calculator}/>
        <Route path="/inventory">{() => <AdminRoute component={Inventory} />}</Route>
        <Route path="/clients">{() => <AdminRoute component={Clients} />}</Route>
        <Route path="/history" component={History}/>
        <Route path="/commissions" component={Commissions}/>
        <Route path="/cashbook">{() => <AdminRoute component={CashBook} />}</Route>
        <Route path="/financeiro">{() => <AdminRoute component={FinanceiroDashboard} />}</Route>
        <Route path="/pedidos-financeiro">{() => <AdminRoute component={PedidosFinanceiro} />}</Route>
        <Route path="/caixa-diario">{() => <AdminRoute component={CaixaDiario} />}</Route>
        <Route path="/relatorios">{() => <AdminRoute component={Relatorios} />}</Route>
        <Route path="/relatorio-clientes">{() => <AdminRoute component={RelatorioClientes} />}</Route>
        <Route path="/settings" component={Settings}/>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function TrialBadge({ days }: { days: number }) {
  if (days <= 0) return null;
  const color = days <= 1 ? "bg-red-100 text-red-700 border-red-200" : days <= 3 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-blue-100 text-blue-700 border-blue-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${color}`}>
      <Clock className="w-3.5 h-3.5" />
      {days === 1 ? "Último dia de teste!" : `${days} dias restantes`}
    </span>
  );
}

function AccessBlockedScreen({ variant, whatsappNumber }: { variant: "trialExpired" | "blocked" | "runtime"; whatsappNumber?: string | null }) {
  const config = {
    trialExpired: {
      bg: "bg-red-50",
      icon: "text-red-500",
      title: "Período de teste encerrado",
      message: "Seu período de avaliação expirou. Entre em contato para continuar utilizando o sistema com acesso completo.",
    },
    blocked: {
      bg: "bg-orange-50",
      icon: "text-orange-500",
      title: "Acesso suspenso",
      message: "O acesso à sua conta foi suspenso. Entre em contato com o suporte para mais informações.",
    },
    runtime: {
      bg: "bg-red-50",
      icon: "text-red-500",
      title: "Acesso indisponível",
      message: "Seu acesso está indisponível. Seu período de teste expirou ou sua conta foi bloqueada.",
    },
  }[variant];

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 w-full max-w-md text-center">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 ${config.bg}`}>
          <AlertTriangle className={`w-8 h-8 ${config.icon}`} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-3">{config.title}</h2>
        <p className="text-sm text-gray-600 mb-6">{config.message}</p>
        {whatsappNumber ? (
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Olá, quero contratar um plano do sistema.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-sm"
          >
            <MessageCircle className="w-5 h-5" />
            Falar com suporte
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 bg-gray-200 text-gray-500 px-6 py-3 rounded-xl font-semibold cursor-not-allowed">
            <MessageCircle className="w-5 h-5" />
            Falar com suporte
          </span>
        )}
        <div className="mt-4">
          <button
            onClick={() => fetch("/api/auth/logout", { method: "POST" }).then(() => window.location.reload())}
            className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
          >
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}

function TrialExpiredScreen({ whatsappNumber }: { whatsappNumber?: string | null }) {
  return <AccessBlockedScreen variant="trialExpired" whatsappNumber={whatsappNumber} />;
}

function ForceChangePassword({ onChanged, showTrialMessage, trialDaysRemaining, currentUsername }: {
  onChanged: () => void;
  showTrialMessage?: boolean;
  trialDaysRemaining?: number | null;
  currentUsername?: string;
}) {
  const [username, setUsername] = useState(currentUsername || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateUsername = (value: string) => {
    if (!value || value.length < 3) return "Mínimo de 3 caracteres.";
    if (/\s/.test(value)) return "Não é permitido espaços.";
    if (!/^[a-z0-9_.]+$/.test(value)) return "Use apenas letras minúsculas, números, underscore ou ponto.";
    return "";
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/\s/g, "");
    setUsername(val);
    setUsernameError(validateUsername(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const uErr = validateUsername(username);
    if (uErr) { setUsernameError(uErr); return; }
    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/force-change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, newUsername: username }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.field === "username") {
          setUsernameError(data.message || "Nome de usuário já está em uso.");
        } else {
          setError(data.message || "Erro ao salvar dados.");
        }
        setLoading(false);
        return;
      }
      onChanged();
    } catch {
      setError("Erro de conexão com o servidor.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-y-auto max-h-[90vh]">
        {showTrialMessage && (
          <div className="p-6 pb-0">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">👋</span>
                <h3 className="font-bold text-blue-900 text-base">Bem-vindo ao sistema!</h3>
              </div>
              <p className="text-sm text-blue-800 leading-relaxed mb-3">
                Você está utilizando uma <strong>versão de avaliação</strong> para testar todas as funcionalidades.
              </p>
              <p className="text-sm text-blue-700 leading-relaxed mb-3">
                Durante esse período, você pode usar o sistema normalmente e ver como ele pode te ajudar a organizar pedidos, financeiro e estoque.
              </p>
              <p className="text-sm text-blue-700 leading-relaxed mb-4">
                Após o período de teste, o acesso passa a ser mediante <strong>assinatura mensal</strong> para manutenção e continuidade do serviço.
              </p>
              <p className="text-sm text-blue-700 leading-relaxed mb-4">
                Qualquer dúvida ou sugestão, estou à disposição para te ajudar 👍
              </p>
              {trialDaysRemaining != null && (
                <div className="flex items-center justify-center">
                  <TrialBadge days={trialDaysRemaining} />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-50 rounded-2xl mb-4">
              <KeyRound className="w-7 h-7 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Defina seu nome de usuário e senha</h2>
            <p className="text-sm text-gray-500 mt-2">Esses serão seus dados de acesso ao sistema a partir de agora.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome de usuário</label>
              <div className="relative">
                <input
                  data-testid="input-force-username"
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  className={`w-full bg-gray-50 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${usernameError ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:ring-primary/30 focus:border-primary/50"}`}
                  placeholder="Ex: joao.silva"
                  autoComplete="username"
                  required
                />
              </div>
              {usernameError ? (
                <p className="text-xs text-red-500 mt-1">{usernameError}</p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">Este será seu login de acesso ao sistema.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  data-testid="input-force-new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmar Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  data-testid="input-force-confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <button
              data-testid="button-force-change-password"
              type="submit"
              disabled={loading || !!usernameError}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
            >
              <KeyRound className="w-5 h-5" />
              {loading ? "Salvando..." : "Finalizar acesso"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function buildAuthUser(data: any): AuthUser {
  return {
    id: data.id,
    username: data.username,
    isAdmin: data.isAdmin || false,
    isMasterAdmin: data.isMasterAdmin || false,
    role: data.role || "company_admin",
    companyId: data.companyId || data.id,
    permissions: data.permissions || [],
    trial: data.trial || false,
    trialEndsAt: data.trialEndsAt || null,
    trialDaysRemaining: data.trialDaysRemaining ?? null,
    trialExpired: data.trialExpired || false,
    accessStatus: data.accessStatus || "full",
    blocked: data.blocked || false,
    mustAcceptTerms: data.mustAcceptTerms || false,
  };
}

const TERMS_VERSION = "1.0";

function TermsAcceptanceModal({ onAccepted }: { onAccepted: () => void }) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAccept = async () => {
    if (!checked) { setError("Você precisa marcar o checkbox para continuar."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/accept-terms", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Erro ao registrar aceite."); setLoading(false); return; }
      onAccepted();
    } catch {
      setError("Erro de conexão com o servidor.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-y-auto max-h-[92vh]">
        <div className="p-6 pb-0">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-2xl mb-4">
              <FileText className="w-7 h-7 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Termos de Uso e Privacidade</h2>
            <p className="text-sm text-gray-500 mt-2">
              Antes de começar a usar o C3D Manager®, leia e aceite os termos abaixo.
            </p>
          </div>

          <div className="space-y-3 mb-5">
            <a
              href="/termos-de-uso"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900 text-sm">Termos de Uso</p>
                  <p className="text-xs text-blue-600">Versão {TERMS_VERSION} — Clique para ler</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
            </a>

            <a
              href="/politica-de-privacidade"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 p-4 bg-purple-50 border border-purple-100 rounded-xl hover:bg-purple-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-purple-900 text-sm">Política de Privacidade</p>
                  <p className="text-xs text-purple-600">Versão {TERMS_VERSION} — Clique para ler</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-purple-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
            </a>
          </div>

          <label className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors mb-5">
            <input
              data-testid="checkbox-accept-terms"
              type="checkbox"
              checked={checked}
              onChange={e => { setChecked(e.target.checked); if (e.target.checked) setError(""); }}
              className="mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0"
            />
            <span className="text-sm text-gray-700 leading-relaxed">
              Li e aceito os <strong>Termos de Uso</strong> e a <strong>Política de Privacidade</strong> do C3D Manager®. Compreendo que meus dados serão tratados conforme descrito nesses documentos.
            </span>
          </label>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 mb-4">
              {error}
            </div>
          )}

          <div className="pb-6 space-y-3">
            <button
              data-testid="button-accept-terms"
              onClick={handleAccept}
              disabled={loading || !checked}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              <ShieldCheck className="w-5 h-5" />
              {loading ? "Registrando aceite..." : "Aceitar e Continuar"}
            </button>
            <button
              onClick={() => fetch("/api/auth/logout", { method: "POST" }).then(() => window.location.reload())}
              className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
            >
              Não aceito — Sair da conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PublicPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          {children}
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function App() {
  const [location] = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isNewCompanyAdmin, setIsNewCompanyAdmin] = useState(false);
  const [needsTerms, setNeedsTerms] = useState(false);
  const [runtimeBlocked, setRuntimeBlocked] = useState(false);
  const [systemWhatsappNumber, setSystemWhatsappNumber] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setRuntimeBlocked(true);
    window.addEventListener("accountBlocked", handler);
    return () => window.removeEventListener("accountBlocked", handler);
  }, []);

  useEffect(() => {
    if (user) {
      fetch("/api/settings")
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.whatsappNumber) setSystemWhatsappNumber(d.whatsappNumber); })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setUser(buildAuthUser(data));
          setNeedsTerms(data.mustAcceptTerms || false);
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  if (location === "/termos-de-uso") {
    return <PublicPageWrapper><TermsOfUse /></PublicPageWrapper>;
  }
  if (location === "/politica-de-privacidade") {
    return <PublicPageWrapper><PrivacyPolicy /></PublicPageWrapper>;
  }

  if (checking) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-muted-foreground text-sm">Carregando...</div>
        </div>
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Login
              onLogin={(u) => {
                const authUser = buildAuthUser(u as any);
                setUser(authUser);
                setNeedsTerms((u as any).mustAcceptTerms || false);
                if ((u as any).mustChangePassword) {
                  setMustChangePassword(true);
                  setIsNewCompanyAdmin(authUser.trial === true && authUser.role === "company_admin");
                }
              }}
            />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  if (!user.isMasterAdmin && runtimeBlocked) {
    return (
      <ThemeProvider>
        <AccessBlockedScreen variant="runtime" whatsappNumber={systemWhatsappNumber} />
      </ThemeProvider>
    );
  }

  if (!user.isMasterAdmin && user.blocked) {
    return (
      <ThemeProvider>
        <AccessBlockedScreen variant="blocked" whatsappNumber={systemWhatsappNumber} />
      </ThemeProvider>
    );
  }

  if (!user.isMasterAdmin && user.trialExpired) {
    return (
      <ThemeProvider>
        <TrialExpiredScreen whatsappNumber={systemWhatsappNumber} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={buildAuthContext(user)}>
          <AppStateProvider>
            <TooltipProvider>
              <Toaster />
              {needsTerms && (
                <TermsAcceptanceModal onAccepted={() => setNeedsTerms(false)} />
              )}
              {!needsTerms && mustChangePassword && (
                <ForceChangePassword
                  onChanged={() => { setMustChangePassword(false); setIsNewCompanyAdmin(false); }}
                  showTrialMessage={isNewCompanyAdmin}
                  trialDaysRemaining={user.trialDaysRemaining}
                  currentUsername={user.username}
                />
              )}
              <Router />
            </TooltipProvider>
          </AppStateProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
