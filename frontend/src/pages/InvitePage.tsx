import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { apiRequest, setToken } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { LogoMark } from "../components/layout/LogoMark";
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
  const passwordIsStrong = form.password.length >= 10 && /[a-z]/.test(form.password) && /[A-Z]/.test(form.password) && /[0-9]/.test(form.password);

  const canSubmit = useMemo(
    () => Boolean(inviteInfo && form.name && form.email && passwordIsStrong && form.password === form.confirmPassword),
    [form.confirmPassword, form.email, form.name, form.password, inviteInfo, passwordIsStrong]
  );

  useEffect(() => {
    if (!initialCode) {
      return;
    }

    let active = true;
    async function checkInvite() {
      setChecking(true);
      setError("");
      try {
        const response = await apiRequest<InviteInfo>(`/auth/invite?code=${encodeURIComponent(initialCode)}`, { skipAuth: true });
        if (active) {
          setInviteInfo(response);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Convite inválido ou expirado");
          setInviteInfo(null);
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    void checkInvite();
    return () => {
      active = false;
    };
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
      navigate("/minha-conta", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao concluir cadastro");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_15%_10%,#fecdd3,transparent_30%),linear-gradient(135deg,#f8fafc,#e2e8f0)] px-4 py-8">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <section className="bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-7 text-slate-100 sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-white/95 p-2 shadow-2xl shadow-red-950/30">
              <LogoMark compact />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">Convite GestaSports</p>
              <h1 className="mt-3 text-4xl font-black leading-none">Complete seu cadastro</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300">Preencha seus dados de atleta e crie sua senha para acessar o sistema.</p>
            </div>
          </div>
        </section>

        <section className="p-6 sm:p-8">
          {!inviteInfo ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="block text-sm font-semibold text-slate-700">
                Código de convite
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none ring-red-300 focus:ring"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  placeholder="Informe o código recebido"
                />
              </label>
              <button type="button" className="mt-3 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60" disabled={checking || !inviteCode} onClick={() => void validateCode()}>
                {checking ? "Validando..." : "Validar convite"}
              </button>
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={18} />
              Convite validado para {inviteInfo.groupName}
            </div>
          )}

          <form className="mt-5 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-600">
                Nome completo
                <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none ring-red-300 focus:ring" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
              </label>
              <label className="block text-sm font-medium text-slate-600">
                Email
                <input type="email" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none ring-red-300 focus:ring" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} required />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-600">
                Telefone/WhatsApp
                <input className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none ring-red-300 focus:ring" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
              </label>
              <label className="block text-sm font-medium text-slate-600">
                Posição
                <select className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none ring-red-300 focus:ring" value={form.position} onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value as AthletePosition }))}>
                  {positionOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-600">
                Criar senha
                <input type="password" minLength={10} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none ring-red-300 focus:ring" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} required />
                <span className="mt-1 block text-xs font-semibold text-slate-500">Use 10 caracteres com letra maiúscula, minúscula e número.</span>
              </label>
              <label className="block text-sm font-medium text-slate-600">
                Confirmar senha
                <input type="password" minLength={10} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none ring-red-300 focus:ring" value={form.confirmPassword} onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} required />
              </label>
            </div>

            {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

            <button type="submit" disabled={!canSubmit || submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
              <ShieldCheck size={18} />
              {submitting ? "Criando acesso..." : "Concluir cadastro"}
            </button>

            <p className="text-center text-sm text-slate-500">
              Já tem acesso <Link to="/login" className="font-semibold text-red-600 hover:underline">Entrar</Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
