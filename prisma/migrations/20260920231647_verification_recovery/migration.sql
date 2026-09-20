-- CreateTable
CREATE TABLE "runtime_challenges" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "runtimeUserId" UUID NOT NULL,
    "purpose" VARCHAR(40) NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "targetHash" VARCHAR(64) NOT NULL,
    "secretHash" VARCHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "nextResendAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "runtime_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "runtime_challenges_projectId_purpose_targetHash_createdAt_idx" ON "runtime_challenges"("projectId", "purpose", "targetHash", "createdAt");

-- CreateIndex
CREATE INDEX "runtime_challenges_runtimeUserId_purpose_consumedAt_expires_idx" ON "runtime_challenges"("runtimeUserId", "purpose", "consumedAt", "expiresAt");

-- AddForeignKey
ALTER TABLE "runtime_challenges" ADD CONSTRAINT "runtime_challenges_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runtime_challenges" ADD CONSTRAINT "runtime_challenges_runtimeUserId_fkey" FOREIGN KEY ("runtimeUserId") REFERENCES "runtime_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
