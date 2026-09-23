const defaults = {
  // Paste a public client ID from the AuthFlow Builder Integrations panel.
  clientId: "",
  issuer: "http://localhost:4444",
  // Docker Desktop may publish Hydra on IPv4 while Windows resolves localhost to IPv6.
  transportOrigin: "http://127.0.0.1:4444",
  redirectUri: "http://localhost:5173/auth/callback",
  scope: "openid profile email offline_access",
};

function safeIssuer(value) {
  try {
    const url = new URL(value);
    const isLocalHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    return isLocalHttp || url.protocol === "https:" ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

const query = new URLSearchParams(window.location.search);
const runtimeKeys = {
  issuer: "authflow.pkce.issuer",
  transportOrigin: "authflow.pkce.transport-origin",
};
const queryIssuer = safeIssuer(query.get("issuer"));
const cachedIssuer = safeIssuer(sessionStorage.getItem(runtimeKeys.issuer));
const issuer = queryIssuer || cachedIssuer || defaults.issuer;
const queryTransportOrigin = safeIssuer(query.get("transport_origin"));
const cachedTransportOrigin = safeIssuer(sessionStorage.getItem(runtimeKeys.transportOrigin));
const transportOrigin = queryTransportOrigin || cachedTransportOrigin || (queryIssuer ? issuer : defaults.transportOrigin);

// These query parameters make the reference client usable against any AuthFlow
// deployment without committing a real client ID or deployment URL to source control.
export const oauthConfig = Object.freeze({
  ...defaults,
  clientId: query.get("client_id") || defaults.clientId,
  issuer,
  transportOrigin,
});

export function persistRuntimeConfig(config) {
  sessionStorage.setItem(runtimeKeys.issuer, config.issuer);
  sessionStorage.setItem(runtimeKeys.transportOrigin, config.transportOrigin);
}
