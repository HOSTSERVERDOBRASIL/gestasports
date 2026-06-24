import QRCode from "qrcode";
import nodemailer from "nodemailer";
import { env } from "../../config/env.js";

type PixPayloadInput = {
  amountCents: number;
  txid: string;
  pixKey: string;
  pixReceiverName: string;
  pixCity: string;
  autoSettleSeconds: number;
};

type PaymentEmailInput = {
  to: string;
  athleteName: string;
  amountCents: number;
  month: number;
  year: number;
};

const settleTimers = new Map<string, NodeJS.Timeout>();

function emvField(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;

  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }

      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function normalizePixName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, 25)
    .toUpperCase();
}

function normalizePixCity(value: string) {
  return value
    .normalize("NFD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^A-Za-z ]/g, "")
    .trim()
    .slice(0, 15)
    .toUpperCase();
}

function buildPixCopyPaste({ amountCents, txid, pixKey, pixReceiverName, pixCity }: PixPayloadInput) {
  const gui = emvField("00", "br.gov.bcb.pix");
  const key = emvField("01", pixKey);
  const merchant = emvField("26", `${gui}${key}`);
  const amount = emvField("54", (amountCents / 100).toFixed(2));
  const additionalData = emvField("62", emvField("05", txid.slice(0, 25)));

  const basePayload = [
    emvField("00", "01"),
    emvField("01", "12"),
    merchant,
    emvField("52", "0000"),
    emvField("53", "986"),
    amount,
    emvField("58", "BR"),
    emvField("59", normalizePixName(pixReceiverName)),
    emvField("60", normalizePixCity(pixCity)),
    additionalData,
    "6304"
  ].join("");

  return `${basePayload}${crc16(basePayload)}`;
}

function buildDynamicPixCopyPaste(input: {
  amountCents: number;
  txid: string;
  location: string;
  pixReceiverName: string;
  pixCity: string;
}) {
  const gui = emvField("00", "br.gov.bcb.pix");
  const location = emvField("25", input.location);
  const merchant = emvField("26", `${gui}${location}`);
  const amount = emvField("54", (input.amountCents / 100).toFixed(2));
  const additionalData = emvField("62", emvField("05", input.txid.slice(0, 25) || "***"));

  const basePayload = [
    emvField("00", "01"),
    emvField("01", "12"),
    merchant,
    emvField("52", "0000"),
    emvField("53", "986"),
    amount,
    emvField("58", "BR"),
    emvField("59", normalizePixName(input.pixReceiverName)),
    emvField("60", normalizePixCity(input.pixCity)),
    additionalData,
    "6304"
  ].join("");

  return `${basePayload}${crc16(basePayload)}`;
}

export function createPixTxid(paymentId: string) {
  return paymentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25);
}

export function canUsePixAutoSettlement() {
  return env.NODE_ENV !== "production";
}

export async function createPixCheckout(input: PixPayloadInput) {
  const pixCopyPaste = buildPixCopyPaste(input);
  return createPixCheckoutFromCopyPaste({
    pixCopyPaste,
    expiresInSeconds: input.autoSettleSeconds
  });
}

export async function createPixCheckoutFromCopyPaste(input: { pixCopyPaste: string; expiresInSeconds: number }) {
  const qrCodeDataUrl = await QRCode.toDataURL(input.pixCopyPaste, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 360
  });

  return {
    pixCopyPaste: input.pixCopyPaste,
    qrCodeDataUrl,
    expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString()
  };
}

export async function createDynamicPixCheckout(input: {
  amountCents: number;
  txid: string;
  location: string;
  pixReceiverName: string;
  pixCity: string;
  expiresInSeconds: number;
}) {
  const pixCopyPaste = buildDynamicPixCopyPaste(input);
  return createPixCheckoutFromCopyPaste({
    pixCopyPaste,
    expiresInSeconds: input.expiresInSeconds
  });
}

export function scheduleAutoSettlement(paymentId: string, seconds: number, onSettle: () => Promise<void>) {
  const previous = settleTimers.get(paymentId);
  if (previous) {
    clearTimeout(previous);
  }

  const timer = setTimeout(() => {
    void onSettle().finally(() => {
      settleTimers.delete(paymentId);
    });
  }, seconds * 1000);

  settleTimers.set(paymentId, timer);
}

export async function sendPaymentConfirmationEmail(input: PaymentEmailInput) {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_FROM) {
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
  });

  const amount = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(input.amountCents / 100);

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: "Pagamento confirmado - GestaSports",
    text: `Ola ${input.athleteName}, recebemos o pagamento de ${amount} referente a ${String(input.month).padStart(2, "0")}/${input.year}.`,
    html: `<p>Olá <strong>${input.athleteName}</strong>,</p><p>Recebemos o pagamento de <strong>${amount}</strong> referente a <strong>${String(input.month).padStart(2, "0")}/${input.year}</strong>.</p><p>Status atualizado automaticamente no sistema GestaSports.</p>`
  });
}
