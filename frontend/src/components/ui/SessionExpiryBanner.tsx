import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export function SessionExpiryBanner() {
  const { sessionExpiringSoon, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  if (!sessionExpiringSoon || !isAuthenticated) {
    return null;
  }

  return (
    <div className="sticky top-0 z-[9998] flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-bold text-amber-950">
      <AlertTriangle size={16} />
      <span>Sua sessão expira em breve.</span>
      <button
        type="button"
        className="rounded-lg border border-amber-950/30 bg-amber-950/10 px-3 py-1 text-xs font-black hover:bg-amber-950/20"
        onClick={() => {
          logout();
          navigate("/login");
        }}
      >
        Renovar
      </button>
    </div>
  );
}
