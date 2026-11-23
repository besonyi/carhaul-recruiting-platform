CREATE TYPE "ContactChannel" AS ENUM ('CALL', 'EMAIL', 'SMS');
CREATE TYPE "ContactDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "ContactOutcome" AS ENUM ('REACHED', 'NO_RESPONSE', 'VOICEMAIL', 'MESSAGE_SENT', 'MESSAGE_RECEIVED');

CREATE TABLE "CandidateContact" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "channel" "ContactChannel" NOT NULL,
    "direction" "ContactDirection" NOT NULL,
    "outcome" "ContactOutcome" NOT NULL,
    "summary" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CandidateContact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CandidateContact_candidateId_occurredAt_id_idx"
    ON "CandidateContact"("candidateId", "occurredAt", "id");
ALTER TABLE "CandidateContact" ADD CONSTRAINT "CandidateContact_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateContact" ADD CONSTRAINT "CandidateContact_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
