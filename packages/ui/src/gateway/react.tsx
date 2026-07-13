/**
 * React binding for the shared gateway session/workspace flow.
 *
 * Headless: resolves the caller's active workspace + memberships and exposes a
 * `select` action. Apps render their own picker UI (see registry's
 * `WorkspacePicker`) from the returned `workspaces`.
 */

import * as React from "react";
import {
  GatewayError,
  type GatewayClient,
  type SessionInfo,
  type WorkspaceSummary,
} from "./client";

export type GatewaySessionStatus =
  | "idle"
  | "loading"
  | "no-workspace"
  | "ready"
  | "unauthenticated"
  | "error";

export interface GatewaySessionState {
  status: GatewaySessionStatus;
  workspaceId: string | null;
  workspaces: WorkspaceSummary[];
  error: string | null;
  select: (workspaceId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Load the gateway session for the current token. Re-runs whenever `enabled`
 * flips true (e.g. after sign-in). A 401 surfaces as `unauthenticated` so the
 * caller can prompt for sign-in.
 */
export function useGatewaySession(
  client: GatewayClient | null,
  enabled = true,
): GatewaySessionState {
  const [status, setStatus] = React.useState<GatewaySessionStatus>("idle");
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);
  const [workspaces, setWorkspaces] = React.useState<WorkspaceSummary[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!client) {
      setStatus("idle");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const session: SessionInfo = await client.getSession();
      setWorkspaces(session.workspaces);
      setWorkspaceId(session.activeWorkspaceId);
      setStatus(session.activeWorkspaceId ? "ready" : "no-workspace");
    } catch (err) {
      if (err instanceof GatewayError && err.status === 401) {
        setStatus("unauthenticated");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load session.");
        setStatus("error");
      }
    }
  }, [client]);

  const select = React.useCallback(
    async (id: string) => {
      if (!client) return;
      const active = await client.selectWorkspace(id);
      setWorkspaceId(active);
      setStatus("ready");
    },
    [client],
  );

  React.useEffect(() => {
    if (enabled) void refresh();
    else setStatus("idle");
  }, [enabled, refresh]);

  return { status, workspaceId, workspaces, error, select, refresh };
}
