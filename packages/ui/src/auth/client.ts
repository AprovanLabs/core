/**
 * Shared Cognito PKCE auth client (framework-agnostic core).
 *
 * Both the registry and patchwork web apps authorize every gateway call with a
 * Cognito **access token** acquired here via the authorization-code + PKCE flow
 * (`oidc-client-ts`). The refresh token is persisted in browser storage so
 * silent renewal can refresh the access token before it expires.
 *
 * Apps supply a small {@link AuthConfig} (see {@link resolveAuthConfig}) and
 * either use {@link createAuthClient} directly or register a process-wide
 * singleton with {@link configureAuth}. Non-React / synchronous call sites read
 * the current token from browser storage via {@link getAccessTokenSync}.
 *
 * Mobile (Capacitor): pass a custom-scheme `redirectUri`, override
 * `settings` (e.g. a native token store), and complete deep-link redirects with
 * `client.completeSignIn(url)`. The in-app-browser / `appUrlOpen` wiring lives
 * in the native app, not here — `client.manager` is exposed for that.
 */

import {
  UserManager,
  WebStorageStateStore,
  type User,
  type UserManagerSettings,
} from "oidc-client-ts";

export interface AuthConfig {
  /** Cognito OIDC issuer / authority, e.g. `https://cognito-idp.<region>.amazonaws.com/<poolId>`. */
  authority: string;
  /** Cognito app client id (the access-token audience the gateway verifies). */
  clientId: string;
  /** Redirect target for the PKCE callback. Default: `${origin}/auth/callback`. */
  redirectUri?: string;
  /** Post-logout landing. Default: `${origin}/`. */
  postLogoutRedirectUri?: string;
  /** Hosted-UI domain, e.g. `https://<prefix>.auth.<region>.amazoncognito.com` (for global sign-out). */
  cognitoDomain?: string;
  /** OAuth scopes. Default: `openid email profile`. */
  scope?: string;
  /**
   * Mirror the current access token into `localStorage[tokenStorageKey]` on
   * every change, so non-React / synchronous callers can read it. Omit to skip.
   */
  tokenStorageKey?: string;
  /** Escape hatch for oidc-client-ts settings (custom store, native redirect, …). */
  settings?: Partial<UserManagerSettings>;
}

/** Minimal, app-friendly view of the signed-in Cognito user. */
export interface AuthUser {
  sub: string;
  email?: string;
  accessToken: string;
  expiresAt?: number;
  /** Full oidc-client-ts user for advanced needs. */
  raw: User;
}

export interface SignOutOptions {
  /** Also end the Cognito SSO session via the hosted-UI logout endpoint. */
  global?: boolean;
}

export interface AuthClient {
  /** Whether Cognito is configured (always true for a constructed client). */
  readonly isConfigured: boolean;
  /** Underlying oidc-client-ts manager (for native / advanced customization). */
  readonly manager: UserManager;
  /** Kick off the PKCE redirect, remembering where to return to. */
  signIn(returnPath?: string): Promise<void>;
  /** Complete the redirect. Pass an explicit `url` for mobile deep links. */
  completeSignIn(url?: string): Promise<AuthUser>;
  /** Read (and clear) the stored post-sign-in return path. */
  consumeReturnPath(): string | null;
  /** Drop the cached user locally; `global` also ends the Cognito SSO session. */
  signOut(options?: SignOutOptions): Promise<void>;
  /** Current user, or null when signed out / expired. */
  getUser(): Promise<AuthUser | null>;
  /** Current access token for `Authorization: Bearer`, or null. */
  getAccessToken(): Promise<string | null>;
  /** Subscribe to user changes (load / unload / silent renew). Returns unsubscribe. */
  onChange(cb: (user: AuthUser | null) => void): () => void;
}

const DEFAULT_SCOPE = "openid email profile";
const RETURN_PATH_KEY = "aprovan_auth_return_path";

function browserOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

function toAuthUser(user: User | null): AuthUser | null {
  if (!user || user.expired || !user.access_token) return null;
  const profile = user.profile ?? {};
  return {
    sub: String(profile.sub ?? ""),
    email: typeof profile.email === "string" ? profile.email : undefined,
    accessToken: user.access_token,
    expiresAt: user.expires_at,
    raw: user,
  };
}

/** Build a standalone auth client for the given Cognito config. */
export function createAuthClient(config: AuthConfig): AuthClient {
  const store =
    typeof window !== "undefined"
      ? new WebStorageStateStore({ store: window.localStorage })
      : undefined;

  const manager = new UserManager({
    authority: config.authority,
    client_id: config.clientId,
    redirect_uri: config.redirectUri ?? `${browserOrigin()}/auth/callback`,
    post_logout_redirect_uri:
      config.postLogoutRedirectUri ?? `${browserOrigin()}/`,
    response_type: "code",
    scope: config.scope ?? DEFAULT_SCOPE,
    response_mode: "query",
    automaticSilentRenew: true,
    // Refresh ~60s before the access token expires.
    accessTokenExpiringNotificationTimeInSeconds: 60,
    userStore: store,
    stateStore: store,
    ...config.settings,
  });

  const mirrorToken = (token: string | null): void => {
    if (!config.tokenStorageKey || typeof window === "undefined") return;
    try {
      if (token) window.localStorage.setItem(config.tokenStorageKey, token);
      else window.localStorage.removeItem(config.tokenStorageKey);
    } catch {
      // storage may be unavailable; sync callers simply see no token.
    }
  };

  // Keep the mirrored token in sync with silent renewals + sign-out.
  manager.events.addUserLoaded((u) => mirrorToken(u.access_token ?? null));
  manager.events.addUserUnloaded(() => mirrorToken(null));

  return {
    isConfigured: true,
    manager,

    async signIn(returnPath?: string): Promise<void> {
      if (returnPath && typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(RETURN_PATH_KEY, returnPath);
      }
      await manager.signinRedirect();
    },

    async completeSignIn(url?: string): Promise<AuthUser> {
      const user = await manager.signinRedirectCallback(url);
      mirrorToken(user.access_token ?? null);
      const authUser = toAuthUser(user);
      if (!authUser) throw new Error("Sign-in completed without a valid token");
      return authUser;
    },

    consumeReturnPath(): string | null {
      if (typeof sessionStorage === "undefined") return null;
      const p = sessionStorage.getItem(RETURN_PATH_KEY);
      sessionStorage.removeItem(RETURN_PATH_KEY);
      return p;
    },

    async signOut(options?: SignOutOptions): Promise<void> {
      mirrorToken(null);
      await manager.removeUser();
      if (options?.global && config.cognitoDomain) {
        const url = new URL(`${config.cognitoDomain.replace(/\/$/, "")}/logout`);
        url.searchParams.set("client_id", config.clientId);
        url.searchParams.set(
          "logout_uri",
          config.postLogoutRedirectUri ?? `${browserOrigin()}/`,
        );
        if (typeof window !== "undefined") window.location.assign(url.toString());
      }
    },

    async getUser(): Promise<AuthUser | null> {
      const user = await manager.getUser();
      // Refresh the mirror on load so sync callers see a live token even when
      // no `userLoaded` event fired (e.g. a returning session after reload).
      mirrorToken(user && !user.expired ? (user.access_token ?? null) : null);
      return toAuthUser(user);
    },

    async getAccessToken(): Promise<string | null> {
      const user = await manager.getUser();
      const token = user && !user.expired ? (user.access_token ?? null) : null;
      mirrorToken(token);
      return token;
    },

    onChange(cb: (user: AuthUser | null) => void): () => void {
      const onLoaded = (u: User): void => cb(toAuthUser(u));
      const onUnloaded = (): void => cb(null);
      manager.events.addUserLoaded(onLoaded);
      manager.events.addUserUnloaded(onUnloaded);
      return () => {
        manager.events.removeUserLoaded(onLoaded);
        manager.events.removeUserUnloaded(onUnloaded);
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Process-wide singleton ("register" API)
// ---------------------------------------------------------------------------

let singleton: AuthClient | null = null;
let singletonTokenKey: string | null = null;

/**
 * Register (or clear) the app-wide auth client. Pass `null` when Cognito is not
 * configured — {@link isAuthConfigured} then reports false and the app can fall
 * back to an unauthenticated mode.
 */
export function configureAuth(config: AuthConfig | null): AuthClient | null {
  singleton = config ? createAuthClient(config) : null;
  singletonTokenKey = config?.tokenStorageKey ?? null;
  return singleton;
}

/** The registered app-wide auth client, or null when not configured. */
export function getAuthClient(): AuthClient | null {
  return singleton;
}

/** Whether an app-wide auth client has been registered. */
export function isAuthConfigured(): boolean {
  return singleton !== null;
}

/**
 * Synchronously read the mirrored access token from browser storage. Useful for
 * non-React call sites (e.g. request builders). Returns null when unconfigured,
 * signed out, or storage is unavailable.
 */
export function getAccessTokenSync(): string | null {
  if (!singletonTokenKey || typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(singletonTokenKey);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Config resolution from env records
// ---------------------------------------------------------------------------

export interface ResolveAuthConfigOptions {
  /**
   * App base path (e.g. `/chat`, `/registry`). Combined with `redirectPath` to
   * build the default `redirectUri` and `postLogoutRedirectUri`.
   */
  basePath?: string;
  /** Callback path appended to origin+basePath. Default: `/auth/callback`. */
  redirectPath?: string;
  /** Mirror the access token to this storage key for sync callers. */
  tokenStorageKey?: string;
  /** Override scopes. */
  scope?: string;
}

type EnvRecord = Record<string, string | undefined>;

function firstDefined(env: EnvRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = env[key];
    if (value) return value;
  }
  return undefined;
}

function joinPath(base: string | undefined, path: string): string {
  const b = (base ?? "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${browserOrigin()}${b}${p}`;
}

/**
 * Build an {@link AuthConfig} from an env record (e.g. `import.meta.env`),
 * trying the common `VITE_COGNITO_*`, `PUBLIC_COGNITO_*`, and bare
 * `COGNITO_*` / `OIDC_*` key variants. Returns `null` when the authority or
 * client id is missing (Cognito optional / not configured).
 */
export function resolveAuthConfig(
  env: EnvRecord,
  options: ResolveAuthConfigOptions = {},
): AuthConfig | null {
  const authority = firstDefined(env, [
    "VITE_COGNITO_AUTHORITY",
    "PUBLIC_COGNITO_AUTHORITY",
    "COGNITO_AUTHORITY",
    "OIDC_ISSUER",
  ]);
  const clientId = firstDefined(env, [
    "VITE_COGNITO_CLIENT_ID",
    "PUBLIC_COGNITO_CLIENT_ID",
    "COGNITO_CLIENT_ID",
    "OIDC_AUDIENCE",
  ]);
  if (!authority || !clientId) return null;

  const cognitoDomain = firstDefined(env, [
    "VITE_COGNITO_DOMAIN",
    "PUBLIC_COGNITO_DOMAIN",
    "COGNITO_DOMAIN",
  ]);

  return {
    authority,
    clientId,
    cognitoDomain,
    scope: options.scope,
    tokenStorageKey: options.tokenStorageKey,
    redirectUri: joinPath(options.basePath, options.redirectPath ?? "/auth/callback"),
    postLogoutRedirectUri: joinPath(options.basePath, "/"),
  };
}
