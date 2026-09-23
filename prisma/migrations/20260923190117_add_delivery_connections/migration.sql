-- CreateEnum
CREATE TYPE "DeliveryProvider" AS ENUM ('RESEND');

-- CreateTable
CREATE TABLE "delivery_connections" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "provider" "DeliveryProvider" NOT NULL,
    "sender" VARCHAR(254) NOT NULL,
    "credentialCipher" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_connections_projectId_key" ON "delivery_connections"("projectId");

-- AddForeignKey
ALTER TABLE "delivery_connections" ADD CONSTRAINT "delivery_connections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
