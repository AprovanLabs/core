/**
 * App-shell session components shared by Aprovan web apps (registry,
 * patchwork): a workspace switcher and a user/profile menu for the top bar,
 * plus a `SessionArea` composition that renders the right thing for each auth
 * state.
 *
 * All components are props-driven (no hook or provider requirements) so each
 * app can wire them to its own auth/gateway plumbing — typically
 * `@aprovan/ui/auth` (`useAuth` or the registered client) and
 * `@aprovan/ui/gateway` (`useGatewaySession`).
 */

import { DropdownMenu } from "radix-ui";
import * as React from "react";
import { cn } from "../index";
import type { WorkspaceSummary } from "../gateway/client";

// ---------------------------------------------------------------------------
// Inline icons (avoid an icon-library dependency)
// ---------------------------------------------------------------------------

function ChevronsUpDownIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function LogInIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Shared dropdown styling
// ---------------------------------------------------------------------------

const dropdownContentClass =
  "z-50 min-w-[200px] overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-md";

const dropdownItemClass =
  "flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-muted";

// ---------------------------------------------------------------------------
// WorkspaceSwitcher
// ---------------------------------------------------------------------------

export interface WorkspaceSwitcherProps {
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string | null;
  onSelect: (workspaceId: string) => void | Promise<void>;
  /** Disable interaction (e.g. while a switch is in flight). */
  disabled?: boolean;
  className?: string;
}

/**
 * Compact top-bar workspace dropdown. Shows the active workspace name; opening
 * it lists every membership with its role.
 */
export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  onSelect,
  disabled = false,
  className,
}: WorkspaceSwitcherProps): React.ReactElement | null {
  if (workspaces.length === 0) return null;

  const active =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    workspaces[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Switch workspace"
        className={cn(
          "inline-flex h-8 max-w-[200px] items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
          className,
        )}
        data-slot="workspace-switcher"
        disabled={disabled}
      >
        <span className="truncate font-medium">{active?.name ?? "Workspace"}</span>
        <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" className={dropdownContentClass} sideOffset={6}>
          <DropdownMenu.Label className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
            Workspaces
          </DropdownMenu.Label>
          {workspaces.map((workspace) => (
            <DropdownMenu.Item
              className={dropdownItemClass}
              key={workspace.id}
              onSelect={() => void onSelect(workspace.id)}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{workspace.name}</span>
                <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                  {workspace.role}
                </span>
              </span>
              {workspace.id === activeWorkspaceId && (
                <CheckIcon className="size-4 shrink-0" />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ---------------------------------------------------------------------------
// UserMenu
// ---------------------------------------------------------------------------

export interface SessionUser {
  email?: string;
  name?: string;
}

export interface SessionLink {
  label: string;
  href: string;
}

export interface UserMenuProps {
  user: SessionUser;
  /** App navigation entries (e.g. Credentials, Admin) shown above sign out. */
  links?: SessionLink[];
  onSignOut?: () => void | Promise<void>;
  className?: string;
}

function initialsOf(user: SessionUser): string {
  const source = user.name?.trim() || user.email?.trim() || "";
  if (!source) return "?";
  const words = source.split(/[\s._@-]+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const second = words.length > 1 ? (words[1]?.[0] ?? "") : "";
  return (first + second).toUpperCase() || "?";
}

/**
 * Profile avatar button with a dropdown: signed-in identity, app links, and
 * sign out. The standard right-most element of a dashboard top bar.
 */
export function UserMenu({
  user,
  links = [],
  onSignOut,
  className,
}: UserMenuProps): React.ReactElement {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Account menu"
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-full border bg-muted text-xs font-semibold text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        data-slot="user-menu"
      >
        {initialsOf(user)}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" className={dropdownContentClass} sideOffset={6}>
          <div className="px-2.5 py-2">
            {user.name && (
              <p className="truncate text-sm font-medium">{user.name}</p>
            )}
            <p className="truncate text-xs text-muted-foreground">
              {user.email ?? "Signed in"}
            </p>
          </div>
          {links.length > 0 && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              {links.map((link) => (
                <DropdownMenu.Item asChild className={dropdownItemClass} key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </DropdownMenu.Item>
              ))}
            </>
          )}
          {onSignOut && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                className={cn(dropdownItemClass, "text-destructive data-[highlighted]:text-destructive")}
                onSelect={() => void onSignOut()}
              >
                Sign out
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ---------------------------------------------------------------------------
// SessionArea
// ---------------------------------------------------------------------------

export type SessionAreaStatus =
  | "loading"
  | "unconfigured"
  | "signed-out"
  | "ready";

export interface SessionAreaProps {
  status: SessionAreaStatus;
  user?: SessionUser | null;
  workspaces?: WorkspaceSummary[];
  activeWorkspaceId?: string | null;
  onSelectWorkspace?: (workspaceId: string) => void | Promise<void>;
  /** Disable the workspace switcher while a selection is in flight. */
  switching?: boolean;
  onSignIn?: () => void | Promise<void>;
  onSignOut?: () => void | Promise<void>;
  /** App navigation entries for the profile menu. */
  links?: SessionLink[];
  signInLabel?: string;
  className?: string;
}

/**
 * The complete top-bar session area: workspace switcher + profile menu when
 * signed in, a sign-in button when signed out, a skeleton while loading, and
 * nothing when auth is unconfigured.
 */
export function SessionArea({
  status,
  user,
  workspaces = [],
  activeWorkspaceId = null,
  onSelectWorkspace,
  switching = false,
  onSignIn,
  onSignOut,
  links,
  signInLabel = "Sign in",
  className,
}: SessionAreaProps): React.ReactElement | null {
  if (status === "unconfigured") return null;

  if (status === "loading") {
    return (
      <div
        className={cn("flex items-center gap-2", className)}
        data-slot="session-area"
      >
        <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
        <div className="size-8 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  if (status === "signed-out") {
    return (
      <div className={cn("flex items-center", className)} data-slot="session-area">
        <button
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => void onSignIn?.()}
          type="button"
        >
          <LogInIcon className="size-3.5" />
          {signInLabel}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)} data-slot="session-area">
      {onSelectWorkspace && (
        <WorkspaceSwitcher
          activeWorkspaceId={activeWorkspaceId}
          disabled={switching}
          onSelect={onSelectWorkspace}
          workspaces={workspaces}
        />
      )}
      <UserMenu links={links} onSignOut={onSignOut} user={user ?? {}} />
    </div>
  );
}
