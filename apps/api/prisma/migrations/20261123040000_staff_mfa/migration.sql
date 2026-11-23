ALTER TABLE "Staff"
    ADD COLUMN "mfaCiphertext" TEXT,
    ADD COLUMN "mfaLastStep" INTEGER;

ALTER TABLE "Session" ADD COLUMN "mfaVerified" BOOLEAN NOT NULL DEFAULT false;
