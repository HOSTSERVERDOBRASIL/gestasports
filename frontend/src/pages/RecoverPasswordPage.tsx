import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../services/api";
import { LogoMark } from "../components/layout/LogoMark";

type ForgotResponse = {
  message: string;
  resetUrl?: string;
};

type TokenInfo = {
  email: string;
  name: string;
  expiresAt: string;
};

export function RecoverPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const isResetMode = Boolean(token);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (isResetMode) {
      return password.length >= 10 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && password === confirmPassword;
    }

    return email.includes("@");
  }, [confirmPassword, email, isResetMode, password]);

  useEffect(() => {
    if (!token) {
      return;
    }

    apiRequest<TokenInfo>(`/auth/password/reset-token?token=${encodeURIComponent(token)}`, { skipAuth: true })
      .then(setTokenInfo)
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Link inválido ou expirado");
      });
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    setResetUrl("");

    try {
      if (isResetMode) {
        if (password !== confirmPassword) {
          throw new Error("As senhas não conferem.");
        }

        const response = await apiRequest<{ message: string }>("/auth/password/reset", {
          method: "POST",
          skipAuth: true,
          body: JSON.stringify({ token, password })
        });

        setMessage(response.message);
        window.setTimeout(() => navigate("/login", { replace: true }), 900);
        return;
      }

      const response = await apiRequest<ForgotResponse>("/auth/password/forgot", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ email })
      });

      setMessage(response.message);
      setResetUrl(response.resetUrl ?? "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível concluir a recuperação");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_15%_10%,#fecdd3,transparent_30%),linear-gradient(135deg,#f8fafc,#e2e8f0)] px-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl sm:p-10">
        <div className="mb-5 flex justify-center">
          <div className="h-24 w-24 overflow-hidden rounded-full bg-white p-2 shadow-lg">
            <LogoMark compact />
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">Acesso seguro</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          {isResetMode ? "Criar nova senha" : "Recuperar senha"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {isResetMode ?
             `Defina uma nova senha${tokenInfo?.email ? ` para ${tokenInfo.email}` : ""}.`
            : "Informe seu email para receber o link de redefinição de senha."}
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {!isResetMode ? (
            <label className="block text-sm font-medium text-slate-600">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none ring-red-300 focus:ring"
              />
            </label>
          ) : (
            <>
              <label className="block text-sm font-medium text-slate-600">
                Nova senha
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={10}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none ring-red-300 focus:ring"
                />
              </label>
              <label className="block text-sm font-medium text-slate-600">
                Confirmar senha
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={10}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none ring-red-300 focus:ring"
                />
              </label>
            </>
          )}

          <button
            type="submit"
            disabled={submitting || !canSubmit || Boolean(isResetMode && error && !tokenInfo)}
            className="w-full rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Processando..." : isResetMode ? "Atualizar senha" : "Enviar link"}
          </button>
        </form>

        {message ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p> : null}
        {resetUrl ? (
          <a className="mt-3 block break-all rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-red-600 hover:underline" href={resetUrl}>
            Abrir link de recuperação gerado
          </a>
        ) : null}
        {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}

        <Link to="/login" className="mt-6 inline-flex text-sm font-semibold text-slate-700 hover:text-red-600">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
