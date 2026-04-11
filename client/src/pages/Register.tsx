import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { FileText, ShieldCheck, Eye, EyeOff, CheckCircle2, UserPlus, Loader2, ChevronsDown } from "lucide-react";
import { TermsBodyContent, TERMS_VERSION } from "./TermsOfUse";
import { PrivacyBodyContent, PRIVACY_VERSION } from "./PrivacyPolicy";

function formatCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function generateLoginPreview(name: string, birthdate: string): string {
  const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
  if (parts.length === 0 || !birthdate) return "";
  const first = parts[0].charAt(0).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
  const year = new Date(birthdate + "T12:00:00").getFullYear();
  if (isNaN(year)) return "";
  return `${first}${last}${year}`;
}

const INPUT_CLASS = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition-colors";
const LABEL_CLASS = "block text-sm font-semibold text-gray-700 mb-1.5";

export default function Register() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({
    name: "", cpf: "", birthdate: "", email: "", phone: "",
    password: "", confirmPassword: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ login: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");
  const [termsRead, setTermsRead] = useState(false);
  const [privacyRead, setPrivacyRead] = useState(false);
  const termsRef = useRef<HTMLDivElement>(null);
  const privacyRef = useRef<HTMLDivElement>(null);

  const bothRead = termsRead && privacyRead;

  const handleTermsScroll = useCallback(() => {
    const el = termsRef.current;
    if (!el || termsRead) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 6) {
      setTermsRead(true);
    }
  }, [termsRead]);

  const handlePrivacyScroll = useCallback(() => {
    const el = privacyRef.current;
    if (!el || privacyRead) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 6) {
      setPrivacyRead(true);
    }
  }, [privacyRead]);

  const set = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setError("");
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.name.trim()) { setError("Nome completo é obrigatório."); return; }
    if (!form.cpf) { setError("CPF é obrigatório."); return; }
    if (form.cpf.replace(/\D/g, "").length !== 11) { setError("CPF inválido."); return; }
    if (!form.birthdate) { setError("Data de nascimento é obrigatória."); return; }
    if (!form.email.trim()) { setError("E-mail é obrigatório."); return; }
    if (!form.password) { setError("Senha é obrigatória."); return; }
    if (form.password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres."); return; }
    if (form.password !== form.confirmPassword) { setError("As senhas não conferem."); return; }
    if (!accepted) { setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          cpf: form.cpf,
          birthdate: form.birthdate,
          email: form.email.trim(),
          phone: form.phone,
          password: form.password,
          confirmPassword: form.confirmPassword,
          acceptedTerms: accepted,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Erro ao criar conta."); setLoading(false); return; }
      setSuccess({ login: data.generatedLogin });
    } catch {
      setError("Erro de conexão. Tente novamente.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-5">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Conta criada com sucesso!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Seu período de teste de 7 dias foi ativado. Faça login para começar.
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs text-blue-600 font-semibold mb-1">Seu login gerado automaticamente:</p>
            <p className="text-lg font-mono font-bold text-blue-800 tracking-wide">{success.login}</p>
            <p className="text-xs text-blue-500 mt-1">Anote — você vai precisar para entrar no sistema.</p>
          </div>
          <button
            onClick={() => setLocation("/")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors shadow-sm"
          >
            Ir para o Login
          </button>
        </div>
      </div>
    );
  }

  const loginPreview = generateLoginPreview(form.name, form.birthdate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg overflow-y-auto max-h-[97vh]">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-sm">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Criar conta de teste</h1>
            <p className="text-sm text-gray-500 mt-1.5">
              7 dias grátis · Sem cartão de crédito · Acesso completo
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className={LABEL_CLASS}>Nome completo *</label>
              <input
                data-testid="input-register-name"
                type="text"
                value={form.name}
                onChange={e => set("name", e.target.value)}
                className={INPUT_CLASS}
                placeholder="Seu nome completo"
              />
              {loginPreview && (
                <p className="text-xs text-blue-600 mt-1.5">
                  Login previsto:{" "}
                  <span className="font-mono bg-blue-50 px-1.5 py-0.5 rounded font-semibold">{loginPreview}</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLASS}>CPF *</label>
                <input
                  data-testid="input-register-cpf"
                  type="text"
                  value={form.cpf}
                  onChange={e => set("cpf", formatCPF(e.target.value))}
                  className={INPUT_CLASS}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Data de nascimento *</label>
                <input
                  data-testid="input-register-birthdate"
                  type="date"
                  value={form.birthdate}
                  onChange={e => set("birthdate", e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div>
              <label className={LABEL_CLASS}>E-mail *</label>
              <input
                data-testid="input-register-email"
                type="email"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                className={INPUT_CLASS}
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Telefone / Celular</label>
              <input
                data-testid="input-register-phone"
                type="text"
                value={form.phone}
                onChange={e => set("phone", formatPhone(e.target.value))}
                className={INPUT_CLASS}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLASS}>Senha *</label>
                <div className="relative">
                  <input
                    data-testid="input-register-password"
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={e => set("password", e.target.value)}
                    className={INPUT_CLASS + " pr-10"}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={LABEL_CLASS}>Confirmar senha *</label>
                <div className="relative">
                  <input
                    data-testid="input-register-confirm-password"
                    type={showConfirm ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={e => set("confirmPassword", e.target.value)}
                    className={INPUT_CLASS + " pr-10"}
                    placeholder="Repita a senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">As senhas não conferem.</p>
                )}
                {form.confirmPassword && form.password === form.confirmPassword && form.password.length >= 6 && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Senhas conferem
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">Documentos obrigatórios — leia antes de aceitar</span>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab("terms")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                      activeTab === "terms"
                        ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500"
                        : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                    Termos de Uso
                    {termsRead && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                    <span className="text-[10px] opacity-60">v{TERMS_VERSION}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("privacy")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                      activeTab === "privacy"
                        ? "bg-purple-50 text-purple-700 border-b-2 border-purple-500"
                        : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                    Política de Privacidade
                    {privacyRead && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                    <span className="text-[10px] opacity-60">v{PRIVACY_VERSION}</span>
                  </button>
                </div>

                <div
                  ref={termsRef}
                  onScroll={handleTermsScroll}
                  className="overflow-y-auto bg-white"
                  style={{ height: 240, display: activeTab === "terms" ? "block" : "none" }}
                >
                  <div className="p-4 text-xs text-gray-700">
                    <TermsBodyContent compact />
                  </div>
                </div>

                <div
                  ref={privacyRef}
                  onScroll={handlePrivacyScroll}
                  className="overflow-y-auto bg-white"
                  style={{ height: 240, display: activeTab === "privacy" ? "block" : "none" }}
                >
                  <div className="p-4 text-xs text-gray-700">
                    <PrivacyBodyContent compact />
                  </div>
                </div>

                {!bothRead && (
                  <div className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 border-t border-amber-100 text-amber-700 text-xs">
                    <ChevronsDown className="w-3.5 h-3.5 flex-shrink-0 animate-bounce" />
                    {!termsRead && !privacyRead
                      ? "Role até o final de cada documento para liberar o aceite"
                      : !termsRead
                      ? 'Ainda falta rolar até o final dos "Termos de Uso"'
                      : 'Ainda falta rolar até o final da "Política de Privacidade"'}
                  </div>
                )}
                {bothRead && (
                  <div className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 border-t border-green-100 text-green-700 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    Documentos lidos — você já pode aceitar abaixo
                  </div>
                )}
              </div>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                  bothRead
                    ? "bg-gray-50 border-gray-200 cursor-pointer hover:bg-gray-100"
                    : "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                }`}
              >
                <input
                  data-testid="checkbox-register-terms"
                  type="checkbox"
                  checked={accepted}
                  disabled={!bothRead}
                  onChange={e => { if (bothRead) { setAccepted(e.target.checked); setError(""); } }}
                  className="mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0"
                />
                <span className="text-xs text-gray-700 leading-relaxed">
                  Li e aceito os <strong>Termos de Uso</strong> e a <strong>Política de Privacidade</strong> do C3D Manager®. Compreendo que meus dados serão tratados conforme descrito nesses documentos.
                </span>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <button
              data-testid="button-register-submit"
              onClick={handleSubmit}
              disabled={loading || !accepted}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors shadow-sm"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta...</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Criar minha conta de teste</>
              )}
            </button>

            <p className="text-center text-sm text-gray-500">
              Já tem conta?{" "}
              <button
                onClick={() => setLocation("/")}
                className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 transition-colors"
              >
                Fazer login
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
