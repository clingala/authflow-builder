import { readAuthEnvironment, readOAuthPlatformEnvironment } from "@/lib/env/runtime";
import { HydraAdminAdapter } from "./hydra-adapter";
import { OAuthPlatformService } from "./service";

let adapter: HydraAdminAdapter | undefined;
let service: OAuthPlatformService | undefined;
export function getOAuthProtocolAdapter() {
  adapter ??= new HydraAdminAdapter(readOAuthPlatformEnvironment().HYDRA_ADMIN_URL);
  return adapter;
}

export function getOAuthPlatformService() {
  service ??= new OAuthPlatformService(getOAuthProtocolAdapter(), readAuthEnvironment().APP_URL);
  return service;
}

export { HydraAdminAdapter, OAuthPlatformRequestError, OAuthPlatformUnavailableError } from "./hydra-adapter";
export type { HydraClientInput, HydraConsentRequest, HydraLoginRequest, OAuthProtocolAdapter } from "./contracts";
export { OAuthFlowMismatchError, OAuthFlowSessionRequiredError, OAuthPlatformService } from "./service";
