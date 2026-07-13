/**
 * Shared gateway session/workspace client (framework-agnostic core).
 *
 * The registry and patchwork apps both talk to the same gateway: a Cognito
 * access token selects the caller, and each request runs against an active
 * **workspace**. This client wraps the session endpoints (`GET /session`,
 * `POST /session/workspace`) and provides a generic authorized {@link request}.
 *
 * It depends only on a `getToken` callback — never on the auth module — so the
 * session flow can be reused or split out independently. Apps typically pass
 * `getAccessTokenSync` (or the auth client's `getAccessToken`) as the token
 * source. Credential/tool endpoints stay in each app (they are app-specific).
 */

export interface WorkspaceSummary {
  id: string;
  name: string;
  role: string;
}

export interface SessionInfo {
  activeWorkspaceId: string | null;
  workspaces: WorkspaceSummary[];
}

export class GatewayError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

type TokenSource = () =>
  | string
  | null
  | undefined
  | Promise<string | null | undefined>;

export interface GatewayClientConfig {
  /** Gateway base URL, e.g. `http://localhost:4000` or `/gateway`. */
  baseUrl: string;
  /** Supplies the current Cognito access token (sync or async). */
  getToken: TokenSource;
  /** Header used to pin the active workspace per request. Default: `X-Aprovan-Workspace`. */
  workspaceHeader?: string;
}

export interface GatewayRequestOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  /** Pin this request to a specific workspace via the workspace header. */
  workspaceId?: string;
}

export interface GatewayClient {
  /** Authorized `fetch` against the gateway; throws {@link GatewayError} on !ok. */
  request<T>(path: string, options?: GatewayRequestOptions): Promise<T>;
  /** The caller's active workspace + all memberships (for the picker). */
  getSession(): Promise<SessionInfo>;
  /** Select the active workspace; returns the confirmed active id. */
  selectWorkspace(workspaceId: string): Promise<string>;
}

async function parseError(res: Response): Promise<GatewayError> {
  let message = res.statusText;
  try {
    const body = (await res.json()) as { error?: string };
    if (typeof body.error === "string") message = body.error;
  } catch {
    // non-JSON body; keep statusText.
  }
  return new GatewayError(res.status, message);
}

export function createGatewayClient(config: GatewayClientConfig): GatewayClient {
  const base = config.baseUrl.replace(/\/$/, "");
  const workspaceHeader = config.workspaceHeader ?? "X-Aprovan-Workspace";

  async function request<T>(
    path: string,
    options: GatewayRequestOptions = {},
  ): Promise<T> {
    const { headers, workspaceId, ...init } = options;
    const token = await config.getToken();
    const merged: Record<string, string> = { ...headers };
    if (token) merged["Authorization"] = `Bearer ${token}`;
    if (workspaceId) merged[workspaceHeader] = workspaceId;

    const res = await fetch(`${base}${path}`, { ...init, headers: merged });
    if (!res.ok) throw await parseError(res);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    request,
    getSession(): Promise<SessionInfo> {
      return request<SessionInfo>("/session");
    },
    async selectWorkspace(workspaceId: string): Promise<string> {
      const body = await request<{ activeWorkspaceId: string }>(
        "/session/workspace",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId }),
        },
      );
      return body.activeWorkspaceId;
    },
  };
}

// ---------------------------------------------------------------------------
// Session persistence (configurable storage keys)
// ---------------------------------------------------------------------------

export interface SessionStoreKeys {
  token: string;
  workspace: string;
}

export interface StoredSession {
  token: string;
  workspaceId: string;
}

/** Persist the token + active workspace (default: sessionStorage). */
export function saveStoredSession(
  keys: SessionStoreKeys,
  session: StoredSession,
  storage: Storage | undefined = typeof sessionStorage !== "undefined"
    ? sessionStorage
    : undefined,
): void {
  storage?.setItem(keys.token, session.token);
  storage?.setItem(keys.workspace, session.workspaceId);
}

/** Read the persisted token + active workspace, or null when incomplete. */
export function loadStoredSession(
  keys: SessionStoreKeys,
  storage: Storage | undefined = typeof sessionStorage !== "undefined"
    ? sessionStorage
    : undefined,
): StoredSession | null {
  const token = storage?.getItem(keys.token) ?? null;
  const workspaceId = storage?.getItem(keys.workspace) ?? null;
  if (!token || !workspaceId) return null;
  return { token, workspaceId };
}

/** Clear the persisted session. */
export function clearStoredSession(
  keys: SessionStoreKeys,
  storage: Storage | undefined = typeof sessionStorage !== "undefined"
    ? sessionStorage
    : undefined,
): void {
  storage?.removeItem(keys.token);
  storage?.removeItem(keys.workspace);
}
