/**
 * React bindings for the shared Cognito auth client.
 *
 * Wrap the app in {@link AuthProvider} (passing either a pre-built `client` or a
 * `config`), read state with {@link useAuth}, and render {@link AuthCallback} at
 * the PKCE redirect route.
 */

import * as React from "react";
import {
  configureAuth,
  createAuthClient,
  getAuthClient,
  type AuthClient,
  type AuthConfig,
  type AuthUser,
  type SignOutOptions,
} from "./client";

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "unconfigured";

export interface AuthContextValue {
  status: AuthStatus;
  isConfigured: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  signIn: (returnPath?: string) => Promise<void>;
  signOut: (options?: SignOutOptions) => Promise<void>;
  /** Re-read the current user from storage (e.g. after a callback). */
  reload: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  /** Pre-built client. Takes precedence over `config`. */
  client?: AuthClient | null;
  /**
   * Config to build a client from. When `null`/omitted and no `client` is
   * given, the provider renders in the "unconfigured" state.
   */
  config?: AuthConfig | null;
  /**
   * Register the built client as the process-wide singleton (so
   * `getAccessTokenSync` and other non-React callers work). Default: true.
   */
  register?: boolean;
  children: React.ReactNode;
}

export function AuthProvider({
  client,
  config,
  register = true,
  children,
}: AuthProviderProps): React.ReactElement {
  const resolved = React.useMemo<AuthClient | null>(() => {
    if (client !== undefined) return client;
    if (!config) return null;
    return register ? configureAuth(config) : createAuthClient(config);
  }, [client, config, register]);

  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [status, setStatus] = React.useState<AuthStatus>(
    resolved ? "loading" : "unconfigured",
  );

  const reload = React.useCallback(async () => {
    if (!resolved) {
      setStatus("unconfigured");
      return;
    }
    const current = await resolved.getUser();
    setUser(current);
    setStatus(current ? "authenticated" : "unauthenticated");
  }, [resolved]);

  React.useEffect(() => {
    if (!resolved) {
      setStatus("unconfigured");
      return;
    }
    void reload();
    return resolved.onChange((next) => {
      setUser(next);
      setStatus(next ? "authenticated" : "unauthenticated");
    });
  }, [resolved, reload]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      isConfigured: resolved !== null,
      user,
      accessToken: user?.accessToken ?? null,
      signIn: async (returnPath?: string) => {
        if (!resolved) throw new Error("Cognito is not configured");
        await resolved.signIn(returnPath);
      },
      signOut: async (options?: SignOutOptions) => {
        if (!resolved) return;
        await resolved.signOut(options);
      },
      reload,
    }),
    [status, resolved, user, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access auth state + actions. Must be used within an {@link AuthProvider}. */
export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export interface AuthCallbackProps {
  /** Called with the post-sign-in return path once the exchange completes. */
  onComplete?: (returnPath: string | null) => void;
  /** Where to send the browser when no return path was stored. Default: `/`. */
  fallbackPath?: string;
  /** Rendered while the code exchange is in flight. */
  loading?: React.ReactNode;
  /** Rendered on failure. Receives the error message. */
  renderError?: (message: string) => React.ReactNode;
  /**
   * Client to complete the redirect with. Defaults to the registered singleton
   * (via {@link useAuth} → provider). Rarely needed.
   */
  client?: AuthClient | null;
}

/**
 * Completes the PKCE authorization-code exchange at the redirect route, then
 * navigates to the stored return path (or `fallbackPath`). Provide `onComplete`
 * to route with an app router instead of `window.location`.
 */
export function AuthCallback({
  onComplete,
  fallbackPath = "/",
  loading,
  renderError,
  client,
}: AuthCallbackProps): React.ReactElement | null {
  const ctx = React.useContext(AuthContext);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void (async () => {
      try {
        // Prefer an explicit client; otherwise complete via the singleton.
        const active = client ?? getAuthClient();
        if (!active) throw new Error("Cognito is not configured");
        await active.completeSignIn();
        await ctx?.reload();
        const returnPath = active.consumeReturnPath();
        if (onComplete) {
          onComplete(returnPath);
        } else if (typeof window !== "undefined") {
          window.location.replace(returnPath ?? fallbackPath);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign-in failed.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <>{renderError ? renderError(error) : error}</>;
  return <>{loading ?? null}</>;
}
