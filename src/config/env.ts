import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16).optional(),
  SAAS_APP_HOST: z.string().default("gestasports.com.br"),
  CORS_ORIGINS: z.string().optional(),
  PIX_KEY: z.string().default("financeiro@gestasports.com.br"),
  PIX_RECEIVER_NAME: z.string().default("GestaSports"),
  PIX_CITY: z.string().default("Florianopolis"),
  PIX_AUTO_SETTLE_SECONDS: z.coerce.number().int().min(5).max(600).default(20),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  WHATSAPP_WEBHOOK_URL: z.string().url().optional(),
  SICOOB_OAUTH_URL: z.string().url().optional(),
  SICOOB_PIX_BASE_URL: z.string().url().optional(),
  SICOOB_PIX_SCOPE: z.string().default("cob.write cob.read pix.read webhook.write webhook.read"),
  SICOOB_CERT_PFX_PATH: z.string().optional(),
  SICOOB_CERT_PATH: z.string().optional(),
  SICOOB_KEY_PATH: z.string().optional(),
  SICOOB_CERT_PASSPHRASE: z.string().optional()
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === "production" && (!env.JWT_SECRET || env.JWT_SECRET === "dev-super-secret-change-in-production")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["JWT_SECRET"],
      message: "JWT_SECRET real é obrigatório em produção."
    });
  }

  // SMTP é opcional — sem ele, recuperação de senha fica desabilitada

  if (env.SICOOB_PIX_BASE_URL || env.SICOOB_OAUTH_URL || env.SICOOB_CERT_PFX_PATH || env.SICOOB_CERT_PATH || env.SICOOB_KEY_PATH) {
    if (!env.SICOOB_PIX_BASE_URL || !env.SICOOB_OAUTH_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SICOOB_PIX_BASE_URL"],
        message: "SICOOB_PIX_BASE_URL e SICOOB_OAUTH_URL devem ser configurados juntos."
      });
    }

    if (!env.SICOOB_CERT_PFX_PATH && (!env.SICOOB_CERT_PATH || !env.SICOOB_KEY_PATH)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SICOOB_CERT_PATH"],
        message: "Informe SICOOB_CERT_PFX_PATH ou o par SICOOB_CERT_PATH/SICOOB_KEY_PATH."
      });
    }
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  JWT_SECRET: parsed.data.JWT_SECRET ?? "dev-super-secret-change-in-production"
};
