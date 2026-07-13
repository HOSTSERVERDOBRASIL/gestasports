import { useState } from "react";
import { apiRequest } from "../../services/api";
import { Modal } from "./Modal";

type ReauthModalProps = {
  open: boolean;
  action: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
};

export function ReauthModal({ open, action, onConfirm, onClose }: ReauthModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    setPassword("");
    setError("");
    setSubmitting(false);
    onClose();
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError("");

    try {
      await apiRequest("/auth/reauth", {
        method: "POST",
        body: JSON.stringify({ password, reason: action })
      });
      await onConfirm();
      handleClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Senha incorreta.");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={action}
      onClose={handleClose}
      size="sm"
      footer={
        <>
          <button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-50" onClick={handleClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
            disabled={submitting || password.length < 1}
            onClick={() => void handleConfirm()}
          >
            {submitting ? "Confirmando..." : "Confirmar"}
          </button>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void handleConfirm();
        }}
      >
        <p className="text-sm text-slate-700">Esta é uma ação sensível. Confirme sua senha para continuar.</p>
        <label className="block text-sm font-bold text-slate-700">
          Senha
          <input
            type="password"
            autoFocus
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm font-bold text-red-700">{error}</p> : null}
        <button type="submit" className="hidden" aria-hidden="true" />
      </form>
    </Modal>
  );
}
