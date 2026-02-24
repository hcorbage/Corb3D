import { useState } from "react";
import { Lock, User, LogIn, Eye, EyeOff, HelpCircle, KeyRound, Copy, Check, FileText, Calendar } from "lucide-react";

type LoginProps = {
  onLogin: (user: { id: string; username: string }) => void;
};

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetUsername, setResetUsername] = useState("");
  const [resetCpf, setResetCpf] = useState("");
  const [resetBirthdate, setResetBirthdate] = useState("");
  const [resetIsAdmin, setResetIsAdmin] = useState(false);
  const [resetChecked, setResetChecked] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    } catch (err) {
      setError("Erro de conexão com o servidor.");
    }
    setLoading(false);
  };

  const handleCheckUsername = async () => {
    if (!resetUsername.trim()) {
      setError("Digite o nome de usuário.");
      return;
    }
    setError("");
    try {
      const res = await fetch("/api/auth/check-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: resetUsername.trim() }),
      });
      const data = await res.json();
      setResetIsAdmin(data.isAdmin || false);
      setResetChecked(true);
    } catch {
      setError("Erro de conexão com o servidor.");
    }
  };

  const handleResetPassword = async () => {
    if (!resetUsername.trim()) {
      setError("Digite o nome de usuário.");
      return;
    }
    setResetLoading(true);
    setError("");
    setTempPassword(null);
    try {
      const body: any = { username: resetUsername.trim() };
      if (resetIsAdmin) {
        if (!resetCpf.replace(/\D/g, '') || !resetBirthdate) {
          setError("CPF e data de nascimento são obrigatórios.");
          setResetLoading(false);
          return;
        }
        body.cpf = resetCpf;
        body.birthdate = resetBirthdate;
      }
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Erro ao resetar senha.");
      } else {
        setTempPassword(data.tempPassword);
        setUsername(resetUsername.trim());
      }
    } catch {
      setError("Erro de conexão com o servidor.");
    }
    setResetLoading(false);
  };

  const handleCopyTemp = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-gray-900">Corb3D</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema de Orçamentos para Impressão 3D</p>
          <p className="text-xs text-gray-400 mt-0.5">{new Date().getFullYear()}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-black/[0.05] border border-gray-100 p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6 text-center">
            Entrar no Sistema
          </h2>

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

            {!showResetForm && (
              <button
                data-testid="button-forgot-password"
                type="button"
                onClick={() => { setShowResetForm(true); setError(""); setTempPassword(null); setResetUsername(""); setResetChecked(false); setResetCpf(""); setResetBirthdate(""); }}
                className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 font-medium"
              >
                <HelpCircle className="w-4 h-4" />
                Esqueci minha senha
              </button>
            )}

            {showResetForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4" />
                    Resetar senha
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShowResetForm(false); setError(""); setTempPassword(null); setResetChecked(false); }}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                  >
                    Fechar
                  </button>
                </div>
                <p className="text-xs text-blue-600">
                  Digite seu nome de usuário para gerar uma senha temporária.
                </p>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
                  <input
                    data-testid="input-reset-username"
                    type="text"
                    value={resetUsername}
                    onChange={(e) => { setResetUsername(e.target.value); setResetChecked(false); setTempPassword(null); }}
                    className="w-full bg-white border border-blue-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                    placeholder="Seu nome de usuário"
                  />
                </div>

                {!resetChecked && !tempPassword && (
                  <button
                    data-testid="button-check-username"
                    type="button"
                    onClick={handleCheckUsername}
                    className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl font-semibold transition-all shadow-sm"
                  >
                    Continuar
                  </button>
                )}

                {resetChecked && resetIsAdmin && !tempPassword && (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs text-amber-700 font-medium">Conta de administrador detectada. Por segurança, confirme seus dados:</p>
                    </div>
                    <div className="relative">
                      <FileText className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
                      <input
                        data-testid="input-reset-cpf"
                        type="text"
                        value={resetCpf}
                        onChange={(e) => setResetCpf(formatCpf(e.target.value))}
                        className="w-full bg-white border border-blue-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                        placeholder="CPF: 000.000.000-00"
                        maxLength={14}
                      />
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
                      <input
                        data-testid="input-reset-birthdate"
                        type="date"
                        value={resetBirthdate}
                        onChange={(e) => setResetBirthdate(e.target.value)}
                        className="w-full bg-white border border-blue-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                      />
                    </div>
                  </>
                )}

                {resetChecked && !tempPassword && (
                  <button
                    data-testid="button-reset-password"
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resetLoading}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl font-semibold transition-all shadow-sm disabled:opacity-50"
                  >
                    <KeyRound className="w-4 h-4" />
                    {resetLoading ? "Gerando..." : "Gerar Senha Temporária"}
                  </button>
                )}

                {tempPassword && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                    <p className="text-sm font-semibold text-green-800">Senha temporária gerada!</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white border border-green-300 rounded-lg px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.3em] text-green-700 select-all">
                        {tempPassword}
                      </code>
                      <button
                        data-testid="button-copy-temp"
                        type="button"
                        onClick={handleCopyTemp}
                        className="p-2.5 bg-white border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
                        title="Copiar"
                      >
                        {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-green-600" />}
                      </button>
                    </div>
                    <p className="text-xs text-green-600">
                      Use esta senha para entrar. O sistema pedirá para criar uma nova senha no primeiro acesso.
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <button
              data-testid="button-submit-login"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
            >
              {loading ? "Aguarde..." : <><LogIn className="w-5 h-5" /> Entrar</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
