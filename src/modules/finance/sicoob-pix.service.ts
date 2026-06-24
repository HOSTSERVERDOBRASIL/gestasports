import { readFileSync } from "node:fs";
import { request as httpsRequest, type RequestOptions } from "node:https";
import { env } from "../../config/env.js";
import { createDynamicPixCheckout, createPixCheckoutFromCopyPaste } from "../athletes/athlete-payment.service.js";

type SicoobPixSettings = {
  providerClientId: string;
  providerClientSecret: string;
  pixKey: string;
  pixReceiverName: string;
  pixCity: string;
  pixAutoSettleSeconds: number;
};

type SicoobPixChargeInput = {
  settings: SicoobPixSettings;
  txid: string;
  amountCents: number;
  payerName: string;
  month: number;
  year: number;
};

type SicoobTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

type SicoobCobResponse = {
  txid?: string;
  status?: string;
  location?: string;
  pixCopiaECola?: string;
  brCode?: string;
  payload?: string;
  qrcode?: string;
  qrCode?: string;
  loc?: {
    location?: string;
  };
};

function centsToPixAmount(amountCents: number) {
  return (amountCents / 100).toFixed(2);
}

function loadTlsOptions() {
  const passphrase = env.SICOOB_CERT_PASSPHRASE || undefined;

  if (env.SICOOB_CERT_PFX_PATH) {
    return {
      pfx: readFileSync(env.SICOOB_CERT_PFX_PATH),
      passphrase
    };
  }

  if (!env.SICOOB_CERT_PATH || !env.SICOOB_KEY_PATH) {
    throw new Error("Certificado mTLS do Sicoob não configurado.");
  }

  return {
    cert: readFileSync(env.SICOOB_CERT_PATH),
    key: readFileSync(env.SICOOB_KEY_PATH),
    passphrase
  };
}

function sicoobRequest<T>(url: string, options: RequestOptions & { body?: string }) {
  const target = new URL(url);
  const body = options.body;

  return new Promise<T>((resolve, reject) => {
    const request = httpsRequest(
      target,
      {
        ...options,
        headers: {
          ...(options.headers ?? {}),
          ...(body ? { "Content-Length": Buffer.byteLength(body) } : {})
        }
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const statusCode = response.statusCode ?? 0;

          if (statusCode < 200 || statusCode >= 300) {
            reject(new Error(`Sicoob retornou HTTP ${statusCode}: ${text.slice(0, 500)}`));
            return;
          }

          if (!text.trim()) {
            resolve({} as T);
            return;
          }

          try {
            resolve(JSON.parse(text) as T);
          } catch {
            reject(new Error("Sicoob retornou uma resposta não JSON."));
          }
        });
      }
    );

    request.on("error", reject);
    if (body) {
      request.write(body);
    }
    request.end();
  });
}

function requiredSicoobConfig(settings: SicoobPixSettings) {
  if (!env.SICOOB_OAUTH_URL || !env.SICOOB_PIX_BASE_URL) {
    throw new Error("URLs da API Pix do Sicoob não configuradas.");
  }

  if (!settings.providerClientId || !settings.providerClientSecret) {
    throw new Error("Client ID e Client Secret do Sicoob não configurados.");
  }

  if (!settings.pixKey) {
    throw new Error("Chave Pix do Sicoob não configurada.");
  }
}

async function getSicoobAccessToken(settings: SicoobPixSettings) {
  const tls = loadTlsOptions();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: env.SICOOB_PIX_SCOPE
  }).toString();

  const credentials = Buffer.from(`${settings.providerClientId}:${settings.providerClientSecret}`).toString("base64");
  const response = await sicoobRequest<SicoobTokenResponse>(env.SICOOB_OAUTH_URL!, {
    method: "POST",
    ...tls,
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.access_token) {
    throw new Error("Sicoob não retornou access_token.");
  }

  return response.access_token;
}

function firstCopyPasteFromSicoob(response: SicoobCobResponse) {
  return response.pixCopiaECola ?? response.brCode ?? response.payload ?? response.qrcode ?? response.qrCode ?? null;
}

function firstLocationFromSicoob(response: SicoobCobResponse) {
  return response.location ?? response.loc?.location ?? null;
}

export function canCreateSicoobPixCharge(settings: SicoobPixSettings) {
  return Boolean(
    env.SICOOB_OAUTH_URL &&
      env.SICOOB_PIX_BASE_URL &&
      (env.SICOOB_CERT_PFX_PATH || (env.SICOOB_CERT_PATH && env.SICOOB_KEY_PATH)) &&
      settings.providerClientId &&
      settings.providerClientSecret &&
      settings.pixKey
  );
}

export async function createSicoobPixCheckout(input: SicoobPixChargeInput) {
  requiredSicoobConfig(input.settings);

  const accessToken = await getSicoobAccessToken(input.settings);
  const tls = loadTlsOptions();
  const baseUrl = env.SICOOB_PIX_BASE_URL!.replace(/\/$/, "");
  const body = JSON.stringify({
    calendario: {
      expiracao: input.settings.pixAutoSettleSeconds
    },
    valor: {
      original: centsToPixAmount(input.amountCents)
    },
    chave: input.settings.pixKey,
    solicitacaoPagador: `Mensalidade ${String(input.month).padStart(2, "0")}/${input.year} - ${input.payerName}`.slice(0, 140),
    infoAdicionais: [
      { nome: "Sistema", valor: "GestaSports" },
      { nome: "Referencia", valor: input.txid }
    ]
  });

  const response = await sicoobRequest<SicoobCobResponse>(`${baseUrl}/cob/${encodeURIComponent(input.txid)}`, {
    method: "PUT",
    ...tls,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body
  });

  const pixCopyPaste = firstCopyPasteFromSicoob(response);
  if (pixCopyPaste) {
    return createPixCheckoutFromCopyPaste({
      pixCopyPaste,
      expiresInSeconds: input.settings.pixAutoSettleSeconds
    });
  }

  const location = firstLocationFromSicoob(response);
  if (location) {
    return createDynamicPixCheckout({
      amountCents: input.amountCents,
      txid: input.txid,
      location,
      pixReceiverName: input.settings.pixReceiverName,
      pixCity: input.settings.pixCity,
      expiresInSeconds: input.settings.pixAutoSettleSeconds
    });
  }

  throw new Error("Sicoob criou a cobrança, mas não retornou Pix copia-e-cola nem location.");
}
