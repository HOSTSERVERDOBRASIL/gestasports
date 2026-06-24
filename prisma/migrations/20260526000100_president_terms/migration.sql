CREATE TABLE "PresidentTerm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startedYear" INTEGER NOT NULL,
    "endedYear" INTEGER,
    "photoUrl" TEXT,
    "note" TEXT,
    "achievements" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PresidentTerm_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PresidentTerm_startedYear_endedYear_idx" ON "PresidentTerm"("startedYear", "endedYear");
