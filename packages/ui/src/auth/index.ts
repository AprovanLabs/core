export {
  createAuthClient,
  configureAuth,
  getAuthClient,
  isAuthConfigured,
  getAccessTokenSync,
  resolveAuthConfig,
  type AuthClient,
  type AuthConfig,
  type AuthUser,
  type SignOutOptions,
  type ResolveAuthConfigOptions,
} from "./client";

export {
  AuthProvider,
  AuthCallback,
  useAuth,
  type AuthProviderProps,
  type AuthCallbackProps,
  type AuthContextValue,
  type AuthStatus,
} from "./react";
