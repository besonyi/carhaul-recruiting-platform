CREATE TYPE "InterviewFormat" AS ENUM ('PHONE', 'VIDEO', 'IN_PERSON');
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELED');

CREATE TABLE "CandidateInterview" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "format" "InterviewFormat" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "logistics" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "outcome" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CandidateInterview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CandidateInterview_candidateId_scheduledAt_idx"
    ON "CandidateInterview"("candidateId", "scheduledAt");
CREATE INDEX "CandidateInterview_assigneeId_status_scheduledAt_id_idx"
    ON "CandidateInterview"("assigneeId", "status", "scheduledAt", "id");
ALTER TABLE "CandidateInterview" ADD CONSTRAINT "CandidateInterview_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateInterview" ADD CONSTRAINT "CandidateInterview_assigneeId_fkey"
    FOREIGN KEY ("assigneeId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
