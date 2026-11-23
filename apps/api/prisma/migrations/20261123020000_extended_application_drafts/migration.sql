ALTER TABLE "ExtendedApplication"
    ADD COLUMN "draft" JSONB,
    ADD COLUMN "draftSavedAt" TIMESTAMP(3),
    ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
