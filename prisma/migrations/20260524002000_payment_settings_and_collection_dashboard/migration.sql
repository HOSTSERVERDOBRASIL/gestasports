CREATE TABLE "PaymentSettings" (
  "id" TEXT NOT NULL DEFAULT 'main',
  "pixKey" TEXT NOT NULL,
  "pixReceiverName" TEXT NOT NULL,
  "pixCity" TEXT NOT NULL,
  "pixAutoSettleSeconds" INTEGER NOT NULL DEFAULT 20,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);
