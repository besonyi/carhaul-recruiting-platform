CREATE INDEX "CandidateContact_candidateId_direction_occurredAt_idx"
    ON "CandidateContact"("candidateId", "direction", "occurredAt");
CREATE INDEX "CandidateInterview_scheduledAt_idx" ON "CandidateInterview"("scheduledAt");
