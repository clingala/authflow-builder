import { getPrisma } from "@/lib/db/prisma";
import { PrismaApplicationClientStore } from "./prisma-application-client-store";
import { ApplicationClientService } from "./service";

let service: ApplicationClientService | undefined;
export function getApplicationClientService() {
  service ??= new ApplicationClientService(new PrismaApplicationClientStore(getPrisma()));
  return service;
}

export { ApplicationClientNotFoundError, ApplicationClientOriginError, ApplicationClientService } from "./service";
export type { ApplicationClient, ApplicationClientStore, PublicClientConfiguration } from "./contracts";
