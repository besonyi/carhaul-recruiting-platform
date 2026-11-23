CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FollowUp_assigneeId_completedAt_canceledAt_dueAt_id_idx"
    ON "FollowUp"("assigneeId", "completedAt", "canceledAt", "dueAt", "id");
CREATE INDEX "FollowUp_candidateId_completedAt_canceledAt_dueAt_idx"
    ON "FollowUp"("candidateId", "completedAt", "canceledAt", "dueAt");

ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_assigneeId_fkey"
    FOREIGN KEY ("assigneeId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
