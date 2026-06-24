import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../services/api";
import type { CurrentTenant } from "../types/domain";
import { getWorkspaceStorageKey } from "../utils/tenantPath";

export function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const tenantQuery = useQuery({
    queryKey: ["tenant-current", getWorkspaceStorageKey()],
    queryFn: () => apiRequest<CurrentTenant>("/tenant/current", { skipAuth: true }),
    retry: false
  });

  const tenant = tenantQuery.data;
  const platformName = tenant?.platformName ?? "GestaSports";
  const clubName = tenant?.brandName ?? tenant?.name ?? "GestaSports";
  const isPlatformLogin = !tenant;
  const displayName = isPlatformLogin ? "GestaSports" : clubName;
  const brandLogo = tenant?.logoUrl ?? "/brand/gestasports-logo-transparent.png";
  const primaryColor = tenant?.primaryColor ?? "#08255b";
  const secondaryColor = tenant?.secondaryColor ?? "#55ad32";
  const focusRingStyle = { "--tw-ring-color": `${primaryColor}55` } as CSSProperties;

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao autenticar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="grid min-h-screen place-items-center px-4"
      style={{
        background: `radial-gradient(circle at 15% 10%, ${primaryColor}26, transparent 30%), linear-gradient(135deg, #f8fafc, #e2e8f0)`
      }}
    >
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-[1.2fr_1fr]">
        <section className="hidden p-10 text-slate-100 lg:block" style={{ background: `linear-gradient(145deg, ${secondaryColor}, #1e293b)` }}>
          <div className="mb-8 flex justify-start">
            <div className="grid h-36 w-36 place-items-center overflow-hidden bg-transparent p-0">
              <img src={brandLogo} alt={displayName} className="max-h-28 max-w-32 object-contain" />
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.26em]" style={{ color: tenant?.accentColor ?? "#fca5a5" }}>{platformName}</p>
          <h1 className="mt-3 max-w-sm text-5xl font-bold leading-[0.95]">Plataforma esportiva premium</h1>
          <p className="mt-4 max-w-md text-sm text-slate-300">
            {isPlatformLogin ? "Painel central para criar clientes, subdomínios e sites esportivos personalizados." : `${clubName} usa um ambiente próprio para financeiro, jogos, disciplina e histórico.`}
          </p>
        </section>

        <section className="p-7 sm:p-10">
          <div className="mb-5 flex justify-center lg:hidden">
            <div className="grid h-24 w-24 place-items-center overflow-hidden bg-transparent p-0">
              <img src={brandLogo} alt={displayName} className="max-h-20 max-w-24 object-contain" />
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: primaryColor }}>Acesso seguro</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">Entrar no {displayName}</h2>
          <p className="mt-2 text-sm text-slate-500">{isPlatformLogin ? "Use seu usuário de superadmin para administrar a GestaSports." : "Use seu usuário deste clube para acessar os módulos da plataforma."}</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-600">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:ring"
                style={focusRingStyle}
              />
            </label>

            <label className="block text-sm font-medium text-slate-600">
              <span className="flex items-center justify-between gap-3">
                Senha
                <Link to="/recuperar-senha" className="text-xs font-semibold hover:underline" style={{ color: primaryColor }}>
                  Esqueci minha senha
                </Link>
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:ring"
                style={focusRingStyle}
              />
            </label>

            <button
              type="submit"
              disabled={submitting || tenantQuery.isLoading}
              className="w-full rounded-xl px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}
            >
              {submitting ? "Entrando..." : "Entrar"}
            </button>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </form>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Recebeu um convite{" "}
            <Link to="/convite" className="font-semibold hover:underline" style={{ color: primaryColor }}>
              Completar cadastro de atleta
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
