-- CreateTable
CREATE TABLE "runtime_users" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "profile" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "runtime_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runtime_sessions" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ipHash" VARCHAR(64),
    "userAgent" VARCHAR(500),

    CONSTRAINT "runtime_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runtime_auth_events" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "runtimeUserId" UUID,
    "eventType" VARCHAR(80) NOT NULL,
    "outcome" VARCHAR(32) NOT NULL,
    "ipHash" VARCHAR(64),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "runtime_auth_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runtime_rate_limits" (
    "keyHash" VARCHAR(64) NOT NULL,
    "projectId" UUID NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "runtime_rate_limits_pkey" PRIMARY KEY ("keyHash")
);

-- CreateIndex
CREATE INDEX "runtime_users_projectId_createdAt_idx" ON "runtime_users"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "runtime_users_projectId_email_key" ON "runtime_users"("projectId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "runtime_sessions_tokenHash_key" ON "runtime_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "runtime_sessions_projectId_expiresAt_idx" ON "runtime_sessions"("projectId", "expiresAt");

-- CreateIndex
CREATE INDEX "runtime_sessions_userId_revokedAt_idx" ON "runtime_sessions"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "runtime_auth_events_projectId_createdAt_idx" ON "runtime_auth_events"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "runtime_auth_events_runtimeUserId_createdAt_idx" ON "runtime_auth_events"("runtimeUserId", "createdAt");

-- CreateIndex
CREATE INDEX "runtime_rate_limits_projectId_action_expiresAt_idx" ON "runtime_rate_limits"("projectId", "action", "expiresAt");

-- AddForeignKey
ALTER TABLE "runtime_users" ADD CONSTRAINT "runtime_users_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runtime_sessions" ADD CONSTRAINT "runtime_sessions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runtime_sessions" ADD CONSTRAINT "runtime_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "runtime_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runtime_auth_events" ADD CONSTRAINT "runtime_auth_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runtime_auth_events" ADD CONSTRAINT "runtime_auth_events_runtimeUserId_fkey" FOREIGN KEY ("runtimeUserId") REFERENCES "runtime_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runtime_rate_limits" ADD CONSTRAINT "runtime_rate_limits_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
