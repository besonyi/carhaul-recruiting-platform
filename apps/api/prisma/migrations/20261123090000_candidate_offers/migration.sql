CREATE TYPE "OfferStatus" AS ENUM ('OPEN', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

CREATE TABLE "CandidateOffer" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "terms" TEXT,
    "responseDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "OfferStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "outcome" TEXT,
    CONSTRAINT "CandidateOffer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CandidateOffer_candidateId_createdAt_id_idx"
    ON "CandidateOffer"("candidateId", "createdAt", "id");
ALTER TABLE "CandidateOffer" ADD CONSTRAINT "CandidateOffer_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateOffer" ADD CONSTRAINT "CandidateOffer_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
