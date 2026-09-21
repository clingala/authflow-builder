import { getPrisma } from "@/lib/db/prisma";
import { PrismaApplicationClientStore } from "./prisma-application-client-store";
import { ApplicationClientService } from "./service";
import { readOAuthPlatformEnvironment } from "@/lib/env/runtime";
import { HydraAdminAdapter } from "@/modules/oauth-platform/hydra-adapter";

let service: ApplicationClientService | undefined;
export function getApplicationClientService() {
  service ??= new ApplicationClientService(
    new PrismaApplicationClientStore(getPrisma()),
    process.env.HYDRA_ADMIN_URL ? new HydraAdminAdapter(readOAuthPlatformEnvironment().HYDRA_ADMIN_URL) : undefined,
  );
  return service;
}

export { ApplicationClientNotFoundError, ApplicationClientOriginError, ApplicationClientService } from "./service";
export type { ApplicationClient, ApplicationClientStore, PublicClientConfiguration } from "./contracts";
