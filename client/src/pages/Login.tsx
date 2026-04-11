import { useState } from "react";
import { Lock, User, LogIn, Eye, EyeOff, HelpCircle, KeyRound, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

type LoginProps = {
  onLogin: (user: { id: string; username: string }) => void;
};

type ResetStep = "idle" | "request" | "confirm" | "master" | "success";

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [resetStep, setResetStep] = useState<ResetStep>("idle");
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetCodeError, setResetCodeError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Erro ao processar.");
        setLoading(false);
        return;
      }
      onLogin(data);
    } catch {
      setError("Erro de conexão com o servidor.");
    }
    setLoading(false);
  };

  const handleRequestCode = async () => {
    if (!resetIdentifier.trim()) {
      setResetError("Informe seu usuário ou email.");
      return;
    }
    if (resetIdentifier.trim() === "claudioevera") {
      setResetStep("master");
      setResetError("");
      setResetNewPassword("");
      setResetConfirmPassword("");
      return;
    }
    setResetError("");
    setResetLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: resetIdentifier.trim() }),
      });
      setResetStep("confirm");
    } catch {
      setResetError("Erro de conexão com o servidor.");
    }
    setResetLoading(false);
  };

  const handleMasterRecovery = async () => {
    setResetError("");
    if (resetNewPassword.length < 6) { setResetError("A senha deve ter pelo menos 6 caracteres."); return; }
    if (resetNewPassword !== resetConfirmPassword) { setResetError("As senhas não conferem."); return; }
    setResetLoading(true);
    try {
      const res = await fetch("/api/auth/master-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: "claudioevera", newPassword: resetNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setResetError(data.message || "Erro ao redefinir a senha."); setResetLoading(false); return; }
      setResetStep("success");
    } catch {
      setResetError("Erro de conexão com o servidor.");
    }
    setResetLoading(false);
  };

  const handleConfirmReset = async () => {
    setResetError("");
    setResetCodeError("");
    if (!resetCode.trim()) { setResetCodeError("Informe o código recebido."); return; }
    if (resetNewPassword.length < 6) { setResetError("A senha deve ter pelo menos 6 caracteres."); return; }
    if (resetNewPassword !== resetConfirmPassword) { setResetError("As senhas não conferem."); return; }
    setResetLoading(true);
    try {
      const res = await fetch("/api/auth/confirm-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: resetIdentifier.trim(),
          code: resetCode.trim(),
          newPassword: resetNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.field === "code") setResetCodeError(data.message);
        else setResetError(data.message || "Erro ao redefinir a senha.");
        setResetLoading(false);
        return;
      }
      setResetStep("success");
    } catch {
      setResetError("Erro de conexão com o servidor.");
    }
    setResetLoading(false);
  };

  const closeReset = () => {
    setResetStep("idle");
    setResetIdentifier("");
    setResetCode("");
    setResetNewPassword("");
    setResetConfirmPassword("");
    setResetError("");
    setResetCodeError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-gray-900">C3D®</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema de Orçamentos para Impressão 3D</p>
          <p className="text-xs text-gray-400 mt-0.5">{new Date().getFullYear()}</p>
        </div>

        {resetStep === "idle" && (
          <div className="bg-white rounded-2xl shadow-xl shadow-black/[0.05] border border-gray-100 p-8">
            <h2 className="text-lg font-bold text-gray-800 mb-6 text-center">Entrar no Sistema</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Usuário</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    data-testid="input-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    placeholder="Digite seu usuário"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    data-testid="input-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    data-testid="button-toggle-password"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2 p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                data-testid="button-forgot-password"
                type="button"
                onClick={() => { setResetStep("request"); setError(""); }}
                className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 font-medium"
              >
                <HelpCircle className="w-4 h-4" />
                Esqueci minha senha
              </button>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>
              )}

              <button
                data-testid="button-submit-login"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                {loading ? "Aguarde..." : <><LogIn className="w-5 h-5" /> Entrar</>}
              </button>

              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400">ou</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <a
                data-testid="link-register"
                href="/cadastro"
                className="w-full flex items-center justify-center gap-2 border border-blue-200 text-blue-700 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all text-sm"
              >
                Criar conta de teste grátis — 7 dias
              </a>
            </form>
          </div>
        )}

        {resetStep === "request" && (
          <div className="bg-white rounded-2xl shadow-xl shadow-black/[0.05] border border-gray-100 p-8">
            <button
              type="button"
              onClick={closeReset}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao login
            </button>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-2xl mb-4">
                <KeyRound className="w-7 h-7 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Recuperar senha</h2>
              <p className="text-sm text-gray-500 mt-2">Informe seu usuário ou email para receber o código de recuperação.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Usuário ou email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    data-testid="input-reset-identifier"
                    type="text"
                    value={resetIdentifier}
                    onChange={(e) => { setResetIdentifier(e.target.value); setResetError(""); }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                    placeholder="seu.usuario ou email@exemplo.com"
                    autoComplete="off"
                  />
                </div>
                {resetError && <p className="text-xs text-red-500 mt-1">{resetError}</p>}
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs text-blue-700">O código será enviado para o email cadastrado na conta. Expira em 15 minutos.</p>
              </div>
              <button
                data-testid="button-request-reset-code"
                type="button"
                onClick={handleRequestCode}
                disabled={resetLoading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-all shadow-sm disabled:opacity-50"
              >
                {resetLoading ? "Enviando..." : <><KeyRound className="w-4 h-4" /> Solicitar código</>}
              </button>
            </div>
          </div>
        )}

        {resetStep === "master" && (
          <div className="bg-white rounded-2xl shadow-xl shadow-black/[0.05] border border-gray-100 p-8">
            <button
              type="button"
              onClick={() => { setResetStep("request"); setResetError(""); }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
                <KeyRound className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Nova senha</h2>
              <p className="text-sm text-gray-500 mt-2">Defina uma nova senha para o administrador.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    type={showResetPassword ? "text" : "password"}
                    value={resetNewPassword}
                    onChange={(e) => { setResetNewPassword(e.target.value); setResetError(""); }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-2 p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showResetPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmar nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    type={showResetPassword ? "text" : "password"}
                    value={resetConfirmPassword}
                    onChange={(e) => { setResetConfirmPassword(e.target.value); setResetError(""); }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              {resetError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{resetError}</div>
              )}
              <button
                type="button"
                onClick={handleMasterRecovery}
                disabled={resetLoading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                {resetLoading ? "Salvando..." : <><KeyRound className="w-4 h-4" /> Redefinir senha</>}
              </button>
            </div>
          </div>
        )}

        {resetStep === "confirm" && (
          <div className="bg-white rounded-2xl shadow-xl shadow-black/[0.05] border border-gray-100 p-8">
            <button
              type="button"
              onClick={() => { setResetStep("request"); setResetCode(""); setResetError(""); setResetCodeError(""); }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-50 rounded-2xl mb-4">
                <KeyRound className="w-7 h-7 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Redefinir senha</h2>
              <p className="text-sm text-gray-500 mt-2">
                Se encontramos a conta, enviamos o código para o email cadastrado. Verifique sua caixa de entrada.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Código de recuperação</label>
                <input
                  data-testid="input-reset-code"
                  type="text"
                  value={resetCode}
                  onChange={(e) => { setResetCode(e.target.value.toUpperCase()); setResetCodeError(""); }}
                  className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-[0.4em] font-bold focus:outline-none focus:ring-2 transition-all uppercase ${resetCodeError ? "border-red-300 focus:ring-red-200 text-red-600" : "border-gray-200 focus:ring-primary/30 text-gray-800"}`}
                  placeholder="XXXXXX"
                  maxLength={6}
                  autoComplete="off"
                />
                {resetCodeError && <p className="text-xs text-red-500 mt-1 text-center">{resetCodeError}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    data-testid="input-reset-new-password"
                    type={showResetPassword ? "text" : "password"}
                    value={resetNewPassword}
                    onChange={(e) => { setResetNewPassword(e.target.value); setResetError(""); }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-2 p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showResetPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmar nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    data-testid="input-reset-confirm-password"
                    type={showResetPassword ? "text" : "password"}
                    value={resetConfirmPassword}
                    onChange={(e) => { setResetConfirmPassword(e.target.value); setResetError(""); }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              {resetError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{resetError}</div>
              )}
              <button
                data-testid="button-confirm-reset"
                type="button"
                onClick={handleConfirmReset}
                disabled={resetLoading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                {resetLoading ? "Salvando..." : <><KeyRound className="w-4 h-4" /> Redefinir senha</>}
              </button>
              <button
                type="button"
                onClick={() => setResetStep("request")}
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Não recebi o código — solicitar novamente
              </button>
            </div>
          </div>
        )}

        {resetStep === "success" && (
          <div className="bg-white rounded-2xl shadow-xl shadow-black/[0.05] border border-gray-100 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-5">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Senha redefinida!</h2>
            <p className="text-sm text-gray-500 mb-6">Sua senha foi atualizada com sucesso. Faça o login com a nova senha.</p>
            <button
              data-testid="button-go-to-login"
              type="button"
              onClick={closeReset}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
            >
              <LogIn className="w-5 h-5" /> Ir para o login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
