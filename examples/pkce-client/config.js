export const oauthConfig = Object.freeze({
  // Paste a public client ID from the AuthFlow Builder Integrations panel.
  clientId: "",
  issuer: "http://localhost:4444",
  // Docker Desktop may publish Hydra on IPv4 while Windows resolves localhost to IPv6.
  // Remove this override when the issuer is reachable directly in the deployment environment.
  transportOrigin: "http://127.0.0.1:4444",
  redirectUri: "http://localhost:5173/auth/callback",
  scope: "openid profile email offline_access",
});
