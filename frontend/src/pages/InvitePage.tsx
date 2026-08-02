import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { apiRequest, setToken } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useTenantTheme } from "../context/TenantThemeContext";
import type { AthletePosition, LoginResponse } from "../types/domain";

const positionOptions: Array<[AthletePosition, string]> = [
  ["GOALKEEPER", "Goleiro"],
  ["DEFENDER", "Zagueiro"],
  ["RIGHT_BACK", "Lateral direito"],
  ["LEFT_BACK", "Lateral esquerdo"],
  ["DEFENSIVE_MIDFIELDER", "Volante"],
  ["CENTRAL_MIDFIELDER", "Meia central"],
  ["ATTACKING_MIDFIELDER", "Meia atacante"],
  ["RIGHT_WINGER", "Ponta direita"],
  ["LEFT_WINGER", "Ponta esquerda"],
  ["STRIKER", "Centroavante"]
];

type InviteInfo = {
  groupName: string;
  closedMode: boolean;
  inviteCode: string;
};

export function InvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const theme = useTenantTheme();

  const initialCode = searchParams.get("codigo") ?? searchParams.get("code") ?? "";
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [checking, setChecking] = useState(Boolean(initialCode));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    position: "CENTRAL_MIDFIELDER" as AthletePosition,
    password: "",
    confirmPassword: ""
  });

  const passwordIsStrong =
    form.password.length >= 10 &&
    /[a-z]/.test(form.password) &&
    /[A-Z]/.test(form.password) &&
    /[0-9]/.test(form.password);

  const canSubmit = useMemo(
    () => Boolean(inviteInfo && form.name && form.email && passwordIsStrong && form.password === form.confirmPassword),
    [form.confirmPassword, form.email, form.name, form.password, inviteInfo, passwordIsStrong]
  );

  // Nome do clube: prefere o que vier do convite validado, depois o do tema
  const clubName = inviteInfo?.groupName ?? theme.brandName;

  useEffect(() => {
    if (!initialCode) return;

    let active = true;
    async function checkInvite() {
      setChecking(true);
      setError("");
      try {
        const response = await apiRequest<InviteInfo>(`/auth/invite?code=${encodeURIComponent(initialCode)}`, { skipAuth: true });
        if (active) setInviteInfo(response);
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Convite inválido ou expirado");
          setInviteInfo(null);
        }
      } finally {
        if (active) setChecking(false);
      }
    }

    void checkInvite();
    return () => { active = false; };
  }, [initialCode]);

  async function validateCode() {
    setChecking(true);
    setError("");
    try {
      const response = await apiRequest<InviteInfo>(`/auth/invite?code=${encodeURIComponent(inviteCode)}`, { skipAuth: true });
      setInviteInfo(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Convite inválido ou expirado");
      setInviteInfo(null);
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setError(form.password !== form.confirmPassword ? "As senhas não conferem." : "Preencha os dados obrigatórios e use uma senha forte.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await apiRequest<LoginResponse>("/auth/invite-register", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({
          inviteCode: inviteInfo?.inviteCode ?? inviteCode,
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          position: form.position,
          password: form.password
        })
      });
      setToken(response.token);
      await refreshMe();
      navigate("/atleta", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao concluir cadastro");
    } finally {
      setSubmitting(false);
    }
  }

  const headerBg = theme.sidebarColor ?? "#0f172a";
  const headerBgStyle = {
    background: `linear-gradient(145deg, ${headerBg}f0, ${headerBg})`
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_15%_10%,#fecdd3,transparent_30%),linear-gradient(135deg,#f8fafc,#e2e8f0)] px-4 py-8">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">

        {/* ── Header dinâmico com logo e cores do clube ── */}
        <section className="p-7 text-white sm:p-9" style={headerBgStyle}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-white/95 p-2 shadow-2xl shadow-black/30">
              {theme.logoUrl ? (
                <img
                  src={theme.logoUrl}
                  alt={clubName}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center rounded-full text-2xl font-black text-white"
                  style={{ background: theme.primaryColor }}
                >
                  {clubName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p
                className="text-xs font-black uppercase tracking-[0.24em]"
                style={{ color: `${theme.primaryColor}cc` }}
              >
                Convite — {clubName}
              </p>
              <h1 className="mt-3 text-4xl font-black leading-none text-white">
                Complete seu cadastro
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/70">
                Preencha seus dados de atleta e crie sua senha para acessar o {clubName}.
              </p>
            </div>
          </div>
        </section>

        {/* ── Formulário ── */}
        <section className="p-6 sm:p-8">
          {!inviteInfo ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="block text-sm font-semibold text-slate-700">
                Código de convite
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2"
                  style={{ "--tw-ring-color": theme.primaryColor } as React.CSSProperties}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Informe o código recebido"
                />
              </label>
              <button
                type="button"
                className="mt-3 rounded-xl px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-60"
                style={{ background: theme.primaryColor }}
                disabled={checking || !inviteCode}
                onClick={() => void validateCode()}
              >
                {checking ? "Validando..." : "Validar convite"}
              </button>
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={18} />
              Convite validado para {inviteInfo.groupName}
            </div>
          )}

          <form className="mt-5 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-600">
                Nome completo
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:ring-2"
                  style={{ "--tw-ring-color": theme.primaryColor } as React.CSSProperties}
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-600">
                Email
                <input
                  type="email"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:ring-2"
                  style={{ "--tw-ring-color": theme.primaryColor } as React.CSSProperties}
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-600">
                Telefone/WhatsApp
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:ring-2"
                  style={{ "--tw-ring-color": theme.primaryColor } as React.CSSProperties}
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium text-slate-600">
                Posição
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:ring-2"
                  style={{ "--tw-ring-color": theme.primaryColor } as React.CSSProperties}
                  value={form.position}
                  onChange={(e) => setForm((p) => ({ ...p, position: e.target.value as AthletePosition }))}
                >
                  {positionOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-600">
                Criar senha
                <input
                  type="password"
                  minLength={10}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:ring-2"
                  style={{ "--tw-ring-color": theme.primaryColor } as React.CSSProperties}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required
                />
                <span className="mt-1 block text-xs font-semibold text-slate-500">
                  Use 10 caracteres com letra maiúscula, minúscula e número.
                </span>
              </label>
              <label className="block text-sm font-medium text-slate-600">
                Confirmar senha
                <input
                  type="password"
                  minLength={10}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:ring-2"
                  style={{ "--tw-ring-color": theme.primaryColor } as React.CSSProperties}
                  value={form.confirmPassword}
                  onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  required
                />
              </label>
            </div>

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: theme.primaryColor }}
            >
              <ShieldCheck size={18} />
              {submitting ? "Criando acesso..." : "Concluir cadastro"}
            </button>

            <p className="text-center text-sm text-slate-500">
              Já tem acesso{" "}
              <Link to="/login" className="font-semibold hover:underline" style={{ color: theme.primaryColor }}>
                Entrar
              </Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
