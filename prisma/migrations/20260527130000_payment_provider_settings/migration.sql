ALTER TABLE "PaymentSettings"
ADD COLUMN "paymentMode" TEXT NOT NULL DEFAULT 'MANUAL_PIX',
ADD COLUMN "paymentProvider" TEXT NOT NULL DEFAULT 'MANUAL_PIX',
ADD COLUMN "providerEnvironment" TEXT NOT NULL DEFAULT 'TEST',
ADD COLUMN "providerApiKey" TEXT,
ADD COLUMN "providerClientId" TEXT,
ADD COLUMN "providerClientSecret" TEXT,
ADD COLUMN "providerWebhookSecret" TEXT,
ADD COLUMN "providerWebhookUrl" TEXT,
ADD COLUMN "autoSettleEnabled" BOOLEAN NOT NULL DEFAULT false;
