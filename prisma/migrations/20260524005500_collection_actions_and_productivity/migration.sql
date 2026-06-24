CREATE TYPE "CollectionStage" AS ENUM ('PRE_DUE_3', 'D_PLUS_3', 'D_PLUS_7', 'D_PLUS_15');
CREATE TYPE "CollectionChannel" AS ENUM ('EMAIL', 'WHATSAPP');

CREATE TABLE "CollectionActionLog" (
  "id" TEXT NOT NULL,
  "associateId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "stage" "CollectionStage" NOT NULL,
  "channel" "CollectionChannel" NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "message" TEXT,
  CONSTRAINT "CollectionActionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CollectionActionLog_sentAt_idx" ON "CollectionActionLog"("sentAt");
CREATE INDEX "CollectionActionLog_stage_channel_idx" ON "CollectionActionLog"("stage", "channel");
CREATE UNIQUE INDEX "CollectionActionLog_paymentId_stage_channel_key" ON "CollectionActionLog"("paymentId", "stage", "channel");

ALTER TABLE "CollectionActionLog" ADD CONSTRAINT "CollectionActionLog_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "Associate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionActionLog" ADD CONSTRAINT "CollectionActionLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
