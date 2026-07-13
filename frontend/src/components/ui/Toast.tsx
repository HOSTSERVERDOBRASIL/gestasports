import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { dismiss, getToasts, subscribe, type ToastItem, type ToastVariant } from "./toast-store";

const variantStyles: Record<ToastVariant, { panel: string; icon: typeof CheckCircle2 }> = {
  success: { panel: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  error: { panel: "border-red-200 bg-red-50 text-red-800", icon: XCircle },
  warning: { panel: "border-amber-200 bg-amber-50 text-amber-800", icon: AlertTriangle },
  info: { panel: "border-blue-200 bg-blue-50 text-blue-800", icon: Info }
};

export function ToastProvider() {
  const [visible, setVisible] = useState<ToastItem[]>(getToasts());

  useEffect(() => subscribe(setVisible), []);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[10000] flex w-full max-w-sm flex-col gap-2">
      {visible.map((item) => {
        const style = variantStyles[item.variant];
        const Icon = style.icon;
        return (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold shadow-[0_14px_30px_rgba(15,23,42,0.12)] ${style.panel}`}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <p className="min-w-0 flex-1 break-words">{item.message}</p>
            <button
              type="button"
              aria-label="Fechar notificação"
              className="shrink-0 rounded p-0.5 opacity-70 transition hover:opacity-100"
              onClick={() => dismiss(item.id)}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
}
