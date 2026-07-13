export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: number;
  variant: ToastVariant;
  message: string;
};

export const MAX_VISIBLE_TOASTS = 3;
const AUTO_DISMISS_MS = 4000;

let nextId = 1;
let items: ToastItem[] = [];
const listeners = new Set<(items: ToastItem[]) => void>();

export function subscribe(listener: (items: ToastItem[]) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts() {
  return items;
}

function notify() {
  for (const listener of listeners) {
    listener(items);
  }
}

function push(variant: ToastVariant, message: string) {
  const id = nextId++;
  items = [...items, { id, variant, message }].slice(-MAX_VISIBLE_TOASTS);
  notify();
  window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
}

export function dismiss(id: number) {
  items = items.filter((item) => item.id !== id);
  notify();
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  warning: (message: string) => push("warning", message),
  info: (message: string) => push("info", message)
};

export function useToast() {
  return toast;
}
