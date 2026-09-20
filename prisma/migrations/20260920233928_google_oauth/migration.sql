-- CreateTable
CREATE TABLE "runtime_oauth_accounts" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "runtimeUserId" UUID NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "runtime_oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runtime_oauth_transactions" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "stateHash" VARCHAR(64) NOT NULL,
    "verifierCipher" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "runtime_oauth_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "runtime_oauth_accounts_projectId_email_idx" ON "runtime_oauth_accounts"("projectId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "runtime_oauth_accounts_projectId_provider_subject_key" ON "runtime_oauth_accounts"("projectId", "provider", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "runtime_oauth_accounts_runtimeUserId_provider_key" ON "runtime_oauth_accounts"("runtimeUserId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "runtime_oauth_transactions_stateHash_key" ON "runtime_oauth_transactions"("stateHash");

-- CreateIndex
CREATE INDEX "runtime_oauth_transactions_projectId_provider_expiresAt_idx" ON "runtime_oauth_transactions"("projectId", "provider", "expiresAt");

-- AddForeignKey
ALTER TABLE "runtime_oauth_accounts" ADD CONSTRAINT "runtime_oauth_accounts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runtime_oauth_accounts" ADD CONSTRAINT "runtime_oauth_accounts_runtimeUserId_fkey" FOREIGN KEY ("runtimeUserId") REFERENCES "runtime_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runtime_oauth_transactions" ADD CONSTRAINT "runtime_oauth_transactions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
