import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  resetKey?: string;
};

type ErrorBoundaryState = {
  error: Error | null;
  componentStack: string;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, componentStack: "" };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erro ao renderizar a página", error, info);
    this.setState({ componentStack: info.componentStack ?? "" });
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null, componentStack: "" });
    }
  }

  render() {
    if (this.state.error) {
      const details = [this.state.error.message, this.state.error.stack, this.state.componentStack].filter(Boolean).join("\n\n");

      return (
        <main className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-8 text-slate-900">
          <section className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase text-red-600">Erro na página</p>
            <h1 className="mt-2 text-2xl font-black">Não foi possível abrir esta área.</h1>
            <p className="mt-3 text-sm font-semibold text-slate-600">
              A página encontrou um dado incompleto ou inesperado. O restante do sistema continua disponível.
            </p>
            <pre className="mt-4 max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
              {details}
            </pre>
            <button
              type="button"
              className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800"
              onClick={() => {
                this.setState({ error: null, componentStack: "" });
                const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
                const tenantRoot = firstSegment && !["login", "superadmin"].includes(firstSegment) ? `/${firstSegment}` : "";
                window.location.assign(`${tenantRoot}/`);
              }}
            >
              Voltar ao painel
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
