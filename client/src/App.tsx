import { useState, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AppStateProvider } from "./context/AppState";
import { AuthContext, useAuth, type AuthUser } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import Calculator from "./pages/Calculator";
import Inventory from "./pages/Inventory";
import Clients from "./pages/Clients";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Commissions from "./pages/Commissions";
import Login from "./pages/Login";
import { Lock, Eye, EyeOff, KeyRound } from "lucide-react";

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
        <Route path="/settings" component={Settings}/>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function ForceChangePassword({ onChanged }: { onChanged: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Erro ao alterar senha.");
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
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-50 rounded-2xl mb-4">
            <KeyRound className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Criar Nova Senha</h2>
          <p className="text-sm text-gray-500 mt-2">Sua senha foi resetada. Por segurança, crie uma nova senha para continuar usando o sistema.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
          >
            <KeyRound className="w-5 h-5" />
            {loading ? "Salvando..." : "Salvar Nova Senha"}
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setUser({ id: data.id, username: data.username, isAdmin: data.isAdmin || false, isMasterAdmin: data.isMasterAdmin || false });
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      navigator.sendBeacon("/api/auth/logout");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Login
            onLogin={(u) => {
              const authUser = { id: u.id, username: u.username, isAdmin: (u as any).isAdmin || false, isMasterAdmin: (u as any).isMasterAdmin || false };
              setUser(authUser);
              if ((u as any).mustChangePassword) {
                setMustChangePassword(true);
              }
            }}
          />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={user}>
        <AppStateProvider>
          <TooltipProvider>
            <Toaster />
            {mustChangePassword && (
              <ForceChangePassword onChanged={() => setMustChangePassword(false)} />
            )}
            <Router />
          </TooltipProvider>
        </AppStateProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
