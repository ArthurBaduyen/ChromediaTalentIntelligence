import { AdminShell } from "../layout/AdminShell";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../shared/components/Button";
import { APP_ROUTES } from "../../../shared/config/routes";
import { useThemePreference } from "../../../shared/hooks/useThemePreference";
import { useAuth } from "../../../shared/auth/AuthProvider";
import {
  createUser,
  deleteUser,
  fetchUsers,
  ManagedUserRecord,
  requestUserPasswordReset,
  setUserPassword,
  updateUser
} from "../data/usersDb";
import { FormInputField } from "../../../shared/components/FormInputField";
import { FormSelectField } from "../../../shared/components/FormSelectField";
import { DataTable } from "../../../shared/components/Table";
import { EmptyState, QueryErrorBanner, TableSkeleton } from "../../../shared/components/QueryStates";
import { ModalShell } from "../../../shared/components/ModalShell";
import { useToast } from "../../../shared/components/ToastProvider";
import { FloatingPopover } from "../../../shared/components/FloatingPopover";
import { RowActionsButton } from "../../../shared/components/RowActionsButton";
import { SearchIcon } from "../../../shared/components/Icons";
import { isValidEmail } from "../../../shared/lib/validation";

function UserActionMenu({
  isOpen,
  onToggle,
  onClose,
  onEdit,
  onReset,
  onSetPassword,
  onDelete,
  label
}: {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEdit: () => void;
  onReset: () => void;
  onSetPassword: () => void;
  onDelete: () => void;
  label: string;
}) {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  return (
    <div ref={triggerRef} className="relative flex justify-center">
      <RowActionsButton ariaLabel={`Actions for ${label}`} onClick={onToggle} />
      <FloatingPopover
        open={isOpen}
        anchorRef={triggerRef}
        align="end"
        className="w-40 rounded-md border border-[#dbe3ea] bg-white py-1 text-left shadow-[0_6px_14px_rgba(15,23,42,0.12)]"
        onRequestClose={onClose}
      >
        <div>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-[#0f172a] hover:bg-[#f1f5f9]"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-[#0f172a] hover:bg-[#f1f5f9]"
            onClick={(event) => {
              event.stopPropagation();
              onReset();
            }}
          >
            Reset Link
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-[#0f172a] hover:bg-[#f1f5f9]"
            onClick={(event) => {
              event.stopPropagation();
              onSetPassword();
            }}
          >
            Set Password
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-[#ef4444] hover:bg-[#fef2f2]"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            Delete
          </button>
        </div>
      </FloatingPopover>
    </div>
  );
}

export function SettingsPage() {
  const { theme, toggleTheme } = useThemePreference();
  const { role, session } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<"ui" | "user">("ui");
  const [users, setUsers] = useState<ManagedUserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManagedUserRecord | null>(null);
  const [setPasswordTarget, setSetPasswordTarget] = useState<ManagedUserRecord | null>(null);
  const [resetTarget, setResetTarget] = useState<ManagedUserRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUserRecord | null>(null);

  const [createEmail, setCreateEmail] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createRole, setCreateRole] = useState<"super_admin" | "admin">("admin");
  const [createPassword, setCreatePassword] = useState("password123");
  const [createEmailError, setCreateEmailError] = useState<string | undefined>(undefined);

  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState<"super_admin" | "admin">("admin");
  const [editEnabled, setEditEnabled] = useState(true);

  const [setPasswordValue, setSetPasswordValue] = useState("");
  const [generatedResetLink, setGeneratedResetLink] = useState<string | null>(null);
  const searchFieldRef = useRef<HTMLInputElement | null>(null);

  const loadUsers = async () => {
    if (role !== "super_admin") return;
    setIsLoading(true);
    setError(null);
    try {
      const rows = await fetchUsers(search);
      setUsers(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (role !== "super_admin") {
      setTab("ui");
      return;
    }
    void loadUsers();
  }, [role]);

  useEffect(() => {
    if (role !== "super_admin") return;
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!editTarget) return;
    setEditUsername(editTarget.username);
    setEditRole(editTarget.role);
    setEditEnabled(editTarget.isEnabled);
  }, [editTarget?.id]);

  useEffect(() => {
    if (!isSearchExpanded) return;
    searchFieldRef.current?.focus();
  }, [isSearchExpanded]);

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        render: (row: ManagedUserRecord) => row.name || row.username
      },
      {
        key: "email",
        label: "Email",
        render: (row: ManagedUserRecord) => row.email
      },
      {
        key: "username",
        label: "Username",
        render: (row: ManagedUserRecord) => row.username
      },
      {
        key: "role",
        label: "Role",
        render: (row: ManagedUserRecord) => (row.role === "super_admin" ? "Super Admin" : "Admin")
      },
      {
        key: "lastLoginAt",
        label: "Last login",
        render: (row: ManagedUserRecord) =>
          row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : "Never"
      },
      {
        key: "status",
        label: "Status",
        render: (row: ManagedUserRecord) => (
          <span className={row.isEnabled ? "text-[#027a48]" : "text-[#b42318]"}>{row.isEnabled ? "Enabled" : "Disabled"}</span>
        )
      },
      {
        key: "actions",
        widthClassName: "w-[64px]",
        label: "",
        render: (row: ManagedUserRecord) => (
          <UserActionMenu
            isOpen={activeActionMenu === row.id}
            onToggle={() => setActiveActionMenu((current) => (current === row.id ? null : row.id))}
            onClose={() => setActiveActionMenu(null)}
            onEdit={() => {
              setActiveActionMenu(null);
              setEditTarget(row);
            }}
            onReset={() => {
              setActiveActionMenu(null);
              setGeneratedResetLink(null);
              setResetTarget(row);
            }}
            onSetPassword={() => {
              setActiveActionMenu(null);
              setSetPasswordTarget(row);
            }}
            onDelete={() => {
              setActiveActionMenu(null);
              setDeleteTarget(row);
            }}
            label={row.email}
          />
        )
      }
    ],
    [activeActionMenu]
  );

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.email.localeCompare(b.email)),
    [users]
  );

  const onCreate = async () => {
    const normalizedEmail = createEmail.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setCreateEmailError("Please enter a valid email address.");
      return;
    }
    setCreateEmailError(undefined);
    try {
      await createUser({
        email: normalizedEmail,
        username: createUsername,
        role: createRole,
        password: createPassword
      });
      setCreateOpen(false);
      setCreateEmail("");
      setCreateUsername("");
      setCreatePassword("password123");
      setCreateEmailError(undefined);
      await loadUsers();
      showToast({ variant: "success", title: "User created" });
    } catch (err) {
      showToast({ variant: "error", title: "Failed to create user", message: err instanceof Error ? err.message : "Please try again" });
    }
  };

  const onUpdate = async () => {
    if (!editTarget) return;
    try {
      await updateUser(editTarget.id, {
        username: editUsername,
        role: editRole,
        isEnabled: editEnabled
      });
      setEditTarget(null);
      await loadUsers();
      showToast({ variant: "success", title: "User updated" });
    } catch (err) {
      showToast({ variant: "error", title: "Failed to update user", message: err instanceof Error ? err.message : "Please try again" });
    }
  };

  const onGenerateReset = async () => {
    if (!resetTarget) return;
    try {
      const payload = await requestUserPasswordReset(resetTarget.id);
      setGeneratedResetLink(payload.resetLink);
      await navigator.clipboard.writeText(payload.resetLink).catch(() => undefined);
      await loadUsers();
      showToast({ variant: "success", title: "Reset link generated and copied" });
    } catch (err) {
      showToast({ variant: "error", title: "Failed to generate reset link", message: err instanceof Error ? err.message : "Please try again" });
    }
  };

  const onSetPassword = async () => {
    if (!setPasswordTarget) return;
    try {
      await setUserPassword(setPasswordTarget.id, setPasswordValue);
      setSetPasswordTarget(null);
      setSetPasswordValue("");
      await loadUsers();
      showToast({ variant: "success", title: "Password updated" });
    } catch (err) {
      showToast({ variant: "error", title: "Failed to set password", message: err instanceof Error ? err.message : "Please try again" });
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    if (session?.email?.toLowerCase() === deleteTarget.email.toLowerCase()) {
      showToast({ variant: "info", title: "You can’t delete your own account" });
      return;
    }
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      await loadUsers();
      showToast({ variant: "success", title: "User deleted" });
    } catch (err) {
      showToast({ variant: "error", title: "Failed to delete user", message: err instanceof Error ? err.message : "Please try again" });
    }
  };

  return (
    <AdminShell>
      <div className="flex min-h-full flex-1 flex-col bg-surface-default p-4 shadow-lg">
        <main className="grid min-h-[calc(100vh-6rem)] grid-cols-[200px_1fr] gap-4">
          <aside>
            <button
              type="button"
              className={`mb-1 w-full px-3 py-2 text-left text-sm ${
                tab === "ui"
                  ? "border-l-4 border-action-primary bg-action-secondary font-semibold text-text-primary"
                  : "border-l-4 border-transparent text-text-secondary hover:bg-action-secondary/70"
              }`}
              onClick={() => setTab("ui")}
            >
              UI
            </button>
            {role === "super_admin" ? (
              <button
                type="button"
                className={`w-full px-3 py-2 text-left text-sm ${
                  tab === "user"
                    ? "border-l-4 border-action-primary bg-action-secondary font-semibold text-text-primary"
                    : "border-l-4 border-transparent text-text-secondary hover:bg-action-secondary/70"
                }`}
                onClick={() => setTab("user")}
              >
                User
              </button>
            ) : null}
          </aside>

          <section className="p-4">
            {tab === "ui" ? (
              <div className="max-w-[560px]">
                <h1 className="text-xl font-semibold text-text-primary">UI Settings</h1>
                <p className="mt-1 text-sm text-text-muted">Theme and design system shortcuts</p>
                <div className="mt-5 flex flex-col items-start gap-3">
                  <Button variant="secondary" onClick={toggleTheme}>
                    Theme: {theme}
                  </Button>
                  <Link to={APP_ROUTES.design}>
                    <Button variant="ghost">Open /design</Button>
                  </Link>
                </div>
                <p className="mt-4 text-xs text-text-muted">Theme preference is persisted locally.</p>
              </div>
            ) : (
              <div>
                <header className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-semibold text-text-primary">User Management</h1>
                    <p className="mt-1 text-sm text-text-muted">Manage Super Admin and Admin accounts.</p>
                  </div>
                  <div className="flex gap-2">
                    <div
                      className={`overflow-hidden transition-all duration-200 ${
                        isSearchExpanded ? "w-[280px] opacity-100" : "w-0 opacity-0"
                      }`}
                    >
                      <div className="flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3">
                        <SearchIcon className="h-4 w-4 text-[#667085]" />
                        <input
                          ref={searchFieldRef}
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search by name or email"
                          className="h-full w-full bg-transparent text-sm text-[#344054] outline-none placeholder:text-[#98a2b3]"
                        />
                      </div>
                    </div>
                    <Button variant="icon" className="h-9 w-9" aria-label="Search" onClick={() => setIsSearchExpanded((v) => !v)}>
                      <SearchIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="primary" onClick={() => setCreateOpen(true)}>
                      + Create User
                    </Button>
                  </div>
                </header>

                {error ? (
                  <QueryErrorBanner
                    error={error}
                    onRetry={() => {
                      void loadUsers();
                    }}
                  />
                ) : null}

                {isLoading && users.length === 0 ? (
                  <TableSkeleton rows={8} />
                ) : sortedUsers.length === 0 ? (
                  <EmptyState title="No users found" message="Create a user or adjust your search." />
                ) : (
                  <DataTable columns={columns} rows={sortedUsers} rowKey={(row) => row.id} allowOverflow />
                )}
              </div>
            )}
          </section>
        </main>
      </div>

      <ModalShell
        open={createOpen}
        title="Create User"
        onClose={() => {
          setCreateOpen(false);
          setCreateEmailError(undefined);
        }}
      >
        <div className="space-y-3">
          <FormInputField label="Email" value={createEmail} onChange={setCreateEmail} type="email" error={createEmailError} />
          <FormInputField label="Username" value={createUsername} onChange={setCreateUsername} />
          <FormSelectField
            label="Role"
            value={createRole}
            onChange={(event) => setCreateRole(event.target.value as "super_admin" | "admin")}
            options={[
              { label: "Super Admin", value: "super_admin" },
              { label: "Admin", value: "admin" }
            ]}
          />
          <FormInputField label="Initial Password" value={createPassword} onChange={setCreatePassword} type="password" />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setCreateOpen(false);
                setCreateEmailError(undefined);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void onCreate()}>
              Create
            </Button>
          </div>
        </div>
      </ModalShell>

      <ModalShell open={Boolean(editTarget)} title="Edit User" onClose={() => setEditTarget(null)}>
        <div className="space-y-3">
          <FormInputField label="Username" value={editUsername} onChange={setEditUsername} />
          <FormSelectField
            label="Role"
            value={editRole}
            onChange={(event) => setEditRole(event.target.value as "super_admin" | "admin")}
            options={[
              { label: "Super Admin", value: "super_admin" },
              { label: "Admin", value: "admin" }
            ]}
          />
          <FormSelectField
            label="Status"
            value={editEnabled ? "enabled" : "disabled"}
            onChange={(event) => setEditEnabled(event.target.value === "enabled")}
            options={[
              { label: "Enabled", value: "enabled" },
              { label: "Disabled", value: "disabled" }
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void onUpdate()}>
              Save
            </Button>
          </div>
        </div>
      </ModalShell>

      <ModalShell open={Boolean(resetTarget)} title="Generate Reset Link" onClose={() => { setResetTarget(null); setGeneratedResetLink(null); }}>
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Generate a one-time password reset link for <strong>{resetTarget?.email}</strong>.
          </p>
          {generatedResetLink ? (
            <div className="rounded-md border border-border-subtle bg-surface-muted p-3">
              <p className="break-all text-xs text-text-secondary">{generatedResetLink}</p>
            </div>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setResetTarget(null); setGeneratedResetLink(null); }}>
              Close
            </Button>
            <Button variant="primary" onClick={() => void onGenerateReset()}>
              Generate Link
            </Button>
          </div>
        </div>
      </ModalShell>

      <ModalShell open={Boolean(setPasswordTarget)} title="Set New Password" onClose={() => setSetPasswordTarget(null)}>
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">Set a new password for <strong>{setPasswordTarget?.email}</strong>.</p>
          <FormInputField label="New Password" value={setPasswordValue} onChange={setSetPasswordValue} type="password" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setSetPasswordTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void onSetPassword()}>
              Save Password
            </Button>
          </div>
        </div>
      </ModalShell>

      <ModalShell open={Boolean(deleteTarget)} title="Delete User" onClose={() => setDeleteTarget(null)}>
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            This will soft-delete <strong>{deleteTarget?.email}</strong> and revoke active sessions.
          </p>
          {session?.email?.toLowerCase() === deleteTarget?.email?.toLowerCase() ? (
            <p className="text-sm text-text-danger">You can’t delete your own account.</p>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              tone="danger"
              onClick={() => void onDelete()}
              disabled={session?.email?.toLowerCase() === deleteTarget?.email?.toLowerCase()}
            >
              Delete
            </Button>
          </div>
        </div>
      </ModalShell>
    </AdminShell>
  );
}
