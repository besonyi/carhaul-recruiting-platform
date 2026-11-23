CREATE TABLE "ExtendedApplication" (
    "candidateId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "answers" JSONB,
    CONSTRAINT "ExtendedApplication_pkey" PRIMARY KEY ("candidateId")
);

CREATE UNIQUE INDEX "ExtendedApplication_invitationId_key" ON "ExtendedApplication"("invitationId");
CREATE UNIQUE INDEX "ExtendedApplication_tokenHash_key" ON "ExtendedApplication"("tokenHash");

ALTER TABLE "ExtendedApplication" ADD CONSTRAINT "ExtendedApplication_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
