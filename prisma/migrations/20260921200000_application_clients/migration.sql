CREATE TABLE "application_clients" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "clientId" VARCHAR(80) NOT NULL,
    "redirectUris" TEXT[] NOT NULL,
    "allowedOrigins" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_clients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "application_clients_clientId_key" ON "application_clients"("clientId");
CREATE INDEX "application_clients_projectId_createdAt_idx" ON "application_clients"("projectId", "createdAt");
ALTER TABLE "application_clients" ADD CONSTRAINT "application_clients_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
