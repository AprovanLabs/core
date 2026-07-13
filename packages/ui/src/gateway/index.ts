export {
  createGatewayClient,
  GatewayError,
  saveStoredSession,
  loadStoredSession,
  clearStoredSession,
  type GatewayClient,
  type GatewayClientConfig,
  type GatewayRequestOptions,
  type SessionInfo,
  type WorkspaceSummary,
  type SessionStoreKeys,
  type StoredSession,
} from "./client";

export {
  useGatewaySession,
  type GatewaySessionState,
  type GatewaySessionStatus,
} from "./react";
