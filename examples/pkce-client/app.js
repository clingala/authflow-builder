import { oauthConfig } from "./config.js";
import { createPkcePair, randomUrlSafe, requireMatchingState } from "./pkce.js";

const elements = {
  signIn: document.querySelector("#sign-in"),
  refresh: document.querySelector("#refresh-token"),
  clear: document.querySelector("#clear-session"),
  status: document.querySelector("#status"),
  output: document.querySelector("#output"),
  clientId: document.querySelector("#client-id"),
  issuer: document.querySelector("#issuer"),
  redirectUri: document.querySelector("#redirect-uri"),
};

const storageKeys = {
  state: "authflow.pkce.state",
  verifier: "authflow.pkce.verifier",
  nonce: "authflow.pkce.nonce",
  clientId: "authflow.pkce.client-id",
};

let tokenSet;

function setStatus(message, kind = "info") {
  elements.status.textContent = message;
  elements.status.dataset.kind = kind;
}

function showResult(data) {
  elements.output.textContent = JSON.stringify(data, null, 2);
  elements.output.hidden = false;
}

async function discover() {
  const transportOrigin = oauthConfig.transportOrigin || oauthConfig.issuer;
  const response = await fetch(`${transportOrigin}/.well-known/openid-configuration`);
  if (!response.ok) throw new Error("OIDC discovery failed.");
  const document = await response.json();
  if (transportOrigin === oauthConfig.issuer) return document;

  const issuerOrigin = new URL(oauthConfig.issuer).origin;
  const rewrite = (value) => {
    if (typeof value !== "string") return value;
    const endpoint = new URL(value);
    return endpoint.origin === issuerOrigin ? `${transportOrigin}${endpoint.pathname}${endpoint.search}` : value;
  };
  return Object.fromEntries(Object.entries(document).map(([key, value]) => [key, key.endsWith("_endpoint") || key === "jwks_uri" ? rewrite(value) : value]));
}

async function beginSignIn() {
  try {
    const clientId = elements.clientId.value.trim();
    if (!clientId || clientId.length > 256) throw new Error("Enter a valid public client ID from AuthFlow Integrations.");
    setStatus("Preparing a secure PKCE request…");
    const discovery = await discover();
    const { verifier, challenge } = await createPkcePair();
    const state = randomUrlSafe();
    const nonce = randomUrlSafe();
    sessionStorage.setItem(storageKeys.verifier, verifier);
    sessionStorage.setItem(storageKeys.state, state);
    sessionStorage.setItem(storageKeys.nonce, nonce);
    sessionStorage.setItem(storageKeys.clientId, clientId);

    const authorization = new URL(discovery.authorization_endpoint);
    authorization.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: oauthConfig.redirectUri,
      response_type: "code",
      scope: oauthConfig.scope,
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
      nonce,
    }).toString();
    window.location.assign(authorization);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to start sign-in.", "error");
  }
}

async function exchangeCode(code, returnedState) {
  const expectedState = sessionStorage.getItem(storageKeys.state);
  const verifier = sessionStorage.getItem(storageKeys.verifier);
  const clientId = sessionStorage.getItem(storageKeys.clientId);
  requireMatchingState(expectedState, returnedState);
  if (!verifier) throw new Error("The PKCE verifier is missing. Start the sign-in flow again.");
  if (!clientId) throw new Error("The OAuth client ID is missing. Start the sign-in flow again.");

  const discovery = await discover();
  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: oauthConfig.redirectUri,
      code,
      code_verifier: verifier,
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error_description || payload.error || "Token exchange failed.");
  tokenSet = payload;
  clearTransaction();
  history.replaceState({}, "", "/");
  await loadUserInfo(discovery);
}

async function loadUserInfo(discovery) {
  const response = await fetch(discovery.userinfo_endpoint, {
    headers: { Authorization: `Bearer ${tokenSet.access_token}` },
  });
  const user = await response.json();
  if (!response.ok) throw new Error("The UserInfo request failed.");
  showResult({
    authenticated: true,
    tokenType: tokenSet.token_type,
    expiresIn: tokenSet.expires_in,
    scopes: tokenSet.scope,
    refreshTokenIssued: Boolean(tokenSet.refresh_token),
    user,
  });
  elements.refresh.disabled = !tokenSet.refresh_token;
  elements.clear.disabled = false;
  setStatus("Authorization Code + PKCE completed successfully.", "success");
}

async function refreshAccessToken() {
  try {
    if (!tokenSet?.refresh_token) throw new Error("No refresh token is available.");
    setStatus("Rotating the refresh token…");
    const discovery = await discover();
    const response = await fetch(discovery.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: sessionStorage.getItem(storageKeys.clientId) || "",
        refresh_token: tokenSet.refresh_token,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error_description || payload.error || "Token refresh failed.");
    tokenSet = payload;
    await loadUserInfo(discovery);
    setStatus("Refresh token rotation completed successfully.", "success");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Token refresh failed.", "error");
  }
}

function clearTransaction() {
  [storageKeys.state, storageKeys.verifier, storageKeys.nonce].forEach((key) => sessionStorage.removeItem(key));
}

function clearSession() {
  tokenSet = undefined;
  clearTransaction();
  sessionStorage.removeItem(storageKeys.clientId);
  elements.output.hidden = true;
  elements.output.textContent = "";
  elements.refresh.disabled = true;
  elements.clear.disabled = true;
  setStatus("Local test-client state cleared. The AuthFlow session was not revoked.");
}

async function initialize() {
  const query = new URLSearchParams(window.location.search);
  elements.clientId.value = query.get("client_id") || sessionStorage.getItem(storageKeys.clientId) || oauthConfig.clientId;
  elements.issuer.textContent = oauthConfig.issuer;
  elements.redirectUri.textContent = oauthConfig.redirectUri;
  elements.signIn.addEventListener("click", beginSignIn);
  elements.refresh.addEventListener("click", refreshAccessToken);
  elements.clear.addEventListener("click", clearSession);

  if (query.has("error")) {
    clearTransaction();
    history.replaceState({}, "", "/");
    setStatus(query.get("error_description") || query.get("error") || "Authorization was denied.", "error");
    return;
  }
  const code = query.get("code");
  if (!code) return;
  try {
    setStatus("Validating state and exchanging the authorization code…");
    await exchangeCode(code, query.get("state"));
  } catch (error) {
    clearTransaction();
    history.replaceState({}, "", "/");
    setStatus(error instanceof Error ? error.message : "OAuth callback failed.", "error");
  }
}

void initialize();
