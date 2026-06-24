import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Clock3, Copy, Mail, MessageCircle, RefreshCw, Send, X } from "lucide-react";

type PixCheckoutModalProps = {
  open: boolean;
  title?: string;
  payerName?: string;
  reference?: string;
  amount: string;
  dueDate?: string;
  status?: string;
  statusTone?: "paid" | "unpaid";
  description?: string;
  beneficiaryName?: string;
  pixKey?: string;
  txid: string;
  pixCopyPaste: string;
  qrCodeDataUrl: string;
  expiresAt?: string;
  autoSettleSeconds?: number;
  whatsappHref?: string;
  emailHref?: string;
  onRefresh?: () => void;
  onClose: () => void;
};

function readEmvField(payload: string, targetId: string) {
  let index = 0;
  while (index + 4 <= payload.length) {
    const id = payload.slice(index, index + 2);
    const length = Number(payload.slice(index + 2, index + 4));
    const valueStart = index + 4;
    const valueEnd = valueStart + length;
    if (!Number.isFinite(length) || length < 0 || valueEnd > payload.length) {
      break;
    }
    if (id === targetId) {
      return payload.slice(valueStart, valueEnd);
    }
    index = valueEnd;
  }
  return "";
}

export function PixCheckoutModal({
  open,
  title = "PIX gerado com sucesso!",
  payerName,
  reference,
  amount,
  dueDate,
  status = "Aguardando pagamento",
  statusTone = "unpaid",
  description = "Mensalidade",
  beneficiaryName,
  pixKey,
  txid,
  pixCopyPaste,
  qrCodeDataUrl,
  expiresAt,
  autoSettleSeconds,
  whatsappHref,
  emailHref,
  onRefresh,
  onClose
}: PixCheckoutModalProps) {
  const [copied, setCopied] = useState(false);
  const initialSeconds = useMemo(() => {
    if (expiresAt) {
      return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
    }
    return Math.max(0, autoSettleSeconds ?? 0);
  }, [autoSettleSeconds, expiresAt]);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  const merchantAccount = readEmvField(pixCopyPaste, "26");
  const resolvedPixKey = pixKey || readEmvField(merchantAccount, "01") || "-";
  const resolvedBeneficiary = beneficiaryName || readEmvField(pixCopyPaste, "59") || "GestaSports";
  const paid = statusTone === "paid";
  const tone = paid
    ? {
      panel: "border-emerald-200 bg-emerald-50 text-emerald-800",
      badge: "border-emerald-200 bg-white/80 text-emerald-800",
      status: "border-emerald-200 bg-emerald-50 text-emerald-700",
      qrHint: "bg-emerald-50 text-emerald-700",
      timer: "border-emerald-200 bg-emerald-50 text-emerald-800"
    }
    : {
      panel: "border-red-200 bg-red-50 text-red-800",
      badge: "border-red-200 bg-white/80 text-red-800",
      status: "border-red-200 bg-red-50 text-red-700",
      qrHint: "bg-red-50 text-red-700",
      timer: "border-red-200 bg-red-50 text-red-800"
    };
  const generatedLabel = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  const countdown = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (!open) {
      return;
    }
    setSecondsLeft(initialSeconds);
  }, [initialSeconds, open, pixCopyPaste]);

  useEffect(() => {
    if (!open || paid || secondsLeft <= 0) {
      return;
    }
    const timer = window.setTimeout(() => setSecondsLeft((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [open, paid, secondsLeft]);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  async function copyPix() {
    await navigator.clipboard.writeText(pixCopyPaste);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (!open) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] grid min-h-screen place-items-center overflow-hidden bg-slate-950/75 px-3 py-3 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-labelledby="pix-checkout-title">
      <div data-pix-txid={txid} className="flex max-h-[96vh] w-full max-w-[720px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 shadow-[0_28px_80px_rgba(15,23,42,0.34)]">
        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-2.5 pt-4">
          <div className="min-w-0">
            <h2 id="pix-checkout-title" className="text-base font-black text-slate-950">{title}</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Escaneie o QR Code ou copie o código PIX para realizar o pagamento.</p>
          </div>
          <button type="button" className="grid size-8 shrink-0 place-items-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900" onClick={onClose} aria-label="Fechar PIX">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 px-4 pb-4">
          <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-black ${tone.panel}`}>
            <span className="inline-flex min-w-0 items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span className="truncate">PIX gerado em {generatedLabel}</span>
            </span>
            <span className={`rounded border px-2.5 py-1 ${tone.badge}`}>{status}</span>
          </div>

          <div className="mt-3 grid min-h-0 gap-4 md:grid-cols-[minmax(12rem,0.82fr)_minmax(0,1.18fr)]">
            <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-2.5">
              <p className="mb-2 text-center text-xs font-black text-slate-700">QR Code PIX</p>
              <img src={qrCodeDataUrl} alt="QR Code PIX" className="mx-auto aspect-square max-h-[30vh] w-full max-w-[220px] bg-white object-contain" />
              <p className={`mt-2 rounded px-2 py-1.5 text-center text-[11px] font-semibold ${tone.qrHint}`}>{paid ? "Pagamento confirmado no sistema." : "Escaneie o QR Code no app do seu banco."}</p>
            </div>

            <dl className="min-w-0 divide-y divide-slate-200 text-xs sm:text-sm">
              <div className="grid grid-cols-[7.25rem_minmax(0,1fr)] gap-3 py-2">
                <dt className="font-semibold text-slate-500">Valor</dt>
                <dd className="text-right font-black text-slate-950">{amount}</dd>
              </div>
              {dueDate ? (
                <div className="grid grid-cols-[7.25rem_minmax(0,1fr)] gap-3 py-2">
                  <dt className="font-semibold text-slate-500">Vencimento</dt>
                  <dd className="text-right font-black text-slate-950">{dueDate}</dd>
                </div>
              ) : null}
              <div className="grid grid-cols-[7.25rem_minmax(0,1fr)] gap-3 py-2">
                <dt className="font-semibold text-slate-500">Beneficiário</dt>
                <dd className="truncate text-right font-black text-slate-950">{resolvedBeneficiary}</dd>
              </div>
              <div className="grid grid-cols-[7.25rem_minmax(0,1fr)] gap-3 py-2">
                <dt className="font-semibold text-slate-500">Status</dt>
                <dd className="text-right"><span className={`rounded border px-2 py-1 text-xs font-black ${tone.status}`}>{status}</span></dd>
              </div>
              <div className="grid grid-cols-[7.25rem_minmax(0,1fr)] gap-3 py-2">
                <dt className="font-semibold text-slate-500">Descrição</dt>
                <dd className="truncate text-right font-black text-slate-950">{description}</dd>
              </div>
              <div className="grid grid-cols-[7.25rem_minmax(0,1fr)] gap-3 py-2">
                <dt className="font-semibold text-slate-500">Chave PIX</dt>
                <dd className="truncate text-right font-black text-slate-950">{resolvedPixKey}</dd>
              </div>
              {payerName || reference ? (
                <div className="grid grid-cols-[7.25rem_minmax(0,1fr)] gap-3 py-2">
                  <dt className="font-semibold text-slate-500">{payerName ? "Pagador" : "Referência"}</dt>
                  <dd className="truncate text-right font-black text-slate-950">{payerName || reference}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {initialSeconds > 0 || paid ? (
            <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-xs font-black ${tone.timer}`}>
              <span className="inline-flex items-center gap-2">
                <Clock3 size={15} />
                {paid ? "Pagamento confirmado" : secondsLeft > 0 ? `Trocar QR Code em ${countdown}` : "Tempo encerrado para este QR Code"}
              </span>
              {!paid && secondsLeft === 0 && onRefresh ? (
                <button type="button" className="inline-flex min-h-8 items-center justify-center gap-2 rounded border border-red-200 bg-white px-2 text-xs font-black text-red-700 hover:bg-red-50" onClick={onRefresh}>
                  <RefreshCw size={14} />
                  Trocar QR Code
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 border-t border-slate-200 pt-3">
            <label className="text-xs font-black text-slate-950" htmlFor="pix-copy-code">Código PIX (Copia e Cola)</label>
            <div className="mt-2 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <textarea id="pix-copy-code" readOnly value={pixCopyPaste} className="h-10 w-full resize-none border-0 bg-transparent p-1 text-[11px] font-semibold leading-4 text-slate-700 outline-none" />
              <button type="button" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50" onClick={() => void copyPix()}>
                {copied ? <Send size={16} /> : <Copy size={16} />}
                {copied ? "Copiado" : "Copiar código"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
            <button type="button" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50" onClick={onClose}>
              Fechar
            </button>
            <div className="flex flex-wrap justify-end gap-2">
              {whatsappHref ? (
                <a className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700 hover:bg-emerald-100" href={whatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle size={16} />
                  Enviar por WhatsApp
                </a>
              ) : null}
              {emailHref ? (
                <a className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 hover:bg-blue-100" href={emailHref}>
                  <Mail size={16} />
                  Enviar por e-mail
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
