import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminShell } from "../layout/AdminShell";
import { SortHeaderLabel } from "../../../shared/components/SortHeaderLabel";
import { DataTable } from "../../../shared/components/Table";
import {
  fetchSharedProfilesPage,
  getSharedProfiles,
  getSharedProfilePublicUrl,
  revokeSharedProfile,
  SharedProfilesQuery,
  SharedProfileRecord,
  updateSharedProfile
} from "../data/sharedProfilesDb";
import { useQueryResource } from "../../../shared/hooks/useQueryResource";
import { ModalShell } from "../../../shared/components/ModalShell";
import { FormInputField } from "../../../shared/components/FormInputField";
import { FormSelectField } from "../../../shared/components/FormSelectField";
import { Button } from "../../../shared/components/Button";
import { useToast } from "../../../shared/components/ToastProvider";
import { RowActionsButton } from "../../../shared/components/RowActionsButton";
import { FloatingPopover } from "../../../shared/components/FloatingPopover";
import { AuditLogRecord, fetchAuditLogs } from "../data/auditLogsDb";
import { EmptyState, QueryErrorBanner, TableSkeleton } from "../../../shared/components/QueryStates";
import { PaginationControls } from "../../../shared/components/PaginationControls";
import type { PaginatedResult } from "../../../shared/types/pagination";

function remainingDays(expirationDate: string) {
  const target = new Date(expirationDate);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.ceil((startTarget - startNow) / (1000 * 60 * 60 * 24));
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function toStatus(row: SharedProfileRecord) {
  if (row.revokedAt) return "Revoked";
  const days = remainingDays(row.expirationDate);
  if (days !== null && days < 0) return "Expired";
  return "Active";
}

function formatActionLabel(action: string) {
  switch (action) {
    case "shared_profile.create":
      return "Shared";
    case "shared_profile.update":
      return "Updated";
    case "shared_profile.revoke":
      return "Revoked";
    case "shared_profile.open":
      return "Opened";
    default:
      return action;
  }
}

function ActionMenu({
  isOpen,
  onToggle,
  onClose,
  onCopyLink,
  onResend,
  onEdit,
  onHistory,
  onRevoke,
  canRevoke,
  label
}: {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onCopyLink: () => void;
  onResend: () => void;
  onEdit: () => void;
  onHistory: () => void;
  onRevoke: () => void;
  canRevoke: boolean;
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
              onCopyLink();
            }}
          >
            Copy Link
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-[#0f172a] hover:bg-[#f1f5f9]"
            onClick={(event) => {
              event.stopPropagation();
              onResend();
            }}
          >
            Resend
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-[#0f172a] hover:bg-[#f1f5f9]"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            Adjust / Extend
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-[#0f172a] hover:bg-[#f1f5f9]"
            onClick={(event) => {
              event.stopPropagation();
              onHistory();
            }}
          >
            History
          </button>
          <button
            type="button"
            disabled={!canRevoke}
            className="block w-full px-3 py-2 text-left text-sm text-[#ef4444] hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={(event) => {
              event.stopPropagation();
              onRevoke();
            }}
          >
            Revoke
          </button>
        </div>
      </FloatingPopover>
    </div>
  );
}

export function SharedProfilesPage() {
  const PAGE_SIZE = 12;
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SharedProfilesQuery["sortBy"]>("sharedAt");
  const [sortDir, setSortDir] = useState<SharedProfilesQuery["sortDir"]>("desc");
  const toggleSort = (nextSortBy: NonNullable<SharedProfilesQuery["sortBy"]>) => {
    setSortBy((previousSortBy) => {
      if (previousSortBy === nextSortBy) {
        setSortDir((previousDir) => (previousDir === "asc" ? "desc" : "asc"));
        return previousSortBy;
      }
      setSortDir("asc");
      return nextSortBy;
    });
  };
  const resource = useQueryResource<PaginatedResult<SharedProfileRecord>>({
    initialData: {
      items: getSharedProfiles().slice(0, PAGE_SIZE),
      page: 1,
      pageSize: PAGE_SIZE,
      total: getSharedProfiles().length,
      totalPages: Math.max(1, Math.ceil(getSharedProfiles().length / PAGE_SIZE))
    },
    fetcher: () =>
      fetchSharedProfilesPage({
        page,
        pageSize: PAGE_SIZE,
        q: query.trim(),
        status: statusFilter,
        sortBy,
        sortDir
      }),
    deps: [page, query, statusFilter, sortBy, sortDir]
  });
  const [editing, setEditing] = useState<SharedProfileRecord | null>(null);
  const [editRate, setEditRate] = useState("");
  const [editExpiration, setEditExpiration] = useState("");
  const [editErrors, setEditErrors] = useState<{ rate?: string; expiration?: string }>({});
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [historyTarget, setHistoryTarget] = useState<SharedProfileRecord | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  useEffect(() => {
    if (!editing) return;
    setEditRate(editing.rateLabel);
    setEditExpiration(editing.expirationDate);
    setEditErrors({});
  }, [editing?.id]);

  useEffect(() => {
    const nextQuery = searchParams.get("q");
    const nextStatus = searchParams.get("status");
    const nextSortBy = searchParams.get("sortBy");
    const nextSortDir = searchParams.get("sortDir");

    setQuery(nextQuery ?? "");
    setStatusFilter(nextStatus ?? "all");
    setSortBy((nextSortBy as SharedProfilesQuery["sortBy"]) ?? "sharedAt");
    setSortDir(nextSortDir === "asc" ? "asc" : "desc");
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, sortBy, sortDir]);

  useEffect(() => {
    fetchAuditLogs()
      .then(setAuditLogs)
      .catch(() => setAuditLogs([]));
  }, []);

  const rows = useMemo(() => resource.data.items, [resource.data.items]);
  const historyRows = useMemo(() => {
    if (!historyTarget) return [];
    return auditLogs
      .filter((item) => item.entityType === "shared_profile" && item.entityId === historyTarget.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [auditLogs, historyTarget]);

  const copySharedLink = async (record: SharedProfileRecord) => {
    const url = getSharedProfilePublicUrl(record);
    try {
      await navigator.clipboard.writeText(url);
      showToast({ variant: "success", title: "Shared link copied" });
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        showToast({ variant: "success", title: "Shared link copied" });
      } catch {
        showToast({ variant: "error", title: "Failed to copy link" });
      }
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "profile",
        label: (
          <SortHeaderLabel active={sortBy === "candidateName"} direction={sortDir} onClick={() => toggleSort("candidateName")}>
            Profile
          </SortHeaderLabel>
        ),
        render: (row: SharedProfileRecord) => (
          <div className="leading-5">
            <p className="font-semibold text-[#242424]">{row.candidateName}</p>
            <p className="text-xs text-[#667085]">{row.candidateRole}</p>
          </div>
        )
      },
      {
        key: "sharedWith",
        label: (
          <SortHeaderLabel active={sortBy === "sharedWithName"} direction={sortDir} onClick={() => toggleSort("sharedWithName")}>
            Shared With
          </SortHeaderLabel>
        ),
        render: (row: SharedProfileRecord) => (
          <div className="leading-5">
            <p className="font-medium text-[#242424]">{row.sharedWithName}</p>
            <p className="text-xs text-[#667085]">{row.sharedWithEmail}</p>
          </div>
        )
      },
      {
        key: "rate",
        label: (
          <SortHeaderLabel active={sortBy === "rateLabel"} direction={sortDir} onClick={() => toggleSort("rateLabel")}>
            Rate
          </SortHeaderLabel>
        ),
        render: (row: SharedProfileRecord) => row.rateLabel
      },
      {
        key: "availability",
        label: (
          <SortHeaderLabel active={sortBy === "expirationDate"} direction={sortDir} onClick={() => toggleSort("expirationDate")}>
            Link Availability
          </SortHeaderLabel>
        ),
        render: (row: SharedProfileRecord) => {
          const days = remainingDays(row.expirationDate);
          return (
            <div className="leading-5">
              <p>{formatDate(row.expirationDate)}</p>
              <p className="text-xs text-[#667085]">
                {days === null ? "-" : days < 0 ? "Expired" : `${days} day${days === 1 ? "" : "s"} remaining`}
              </p>
            </div>
          );
        }
      },
      {
        key: "status",
        label: (
          <SortHeaderLabel active={sortBy === "status"} direction={sortDir} onClick={() => toggleSort("status")}>
            Status
          </SortHeaderLabel>
        ),
        render: (row: SharedProfileRecord) => {
          const status = toStatus(row);
          const styles =
            status === "Active"
              ? "bg-[#ecfdf3] text-[#027a48]"
              : status === "Expired"
                ? "bg-[#fff4ed] text-[#b54708]"
                : "bg-[#fef3f2] text-[#b42318]";
          return <span className={`inline-flex rounded-[999px] px-2 py-1 text-xs font-semibold ${styles}`}>{status}</span>;
        }
      },
      {
        key: "opened",
        label: (
          <SortHeaderLabel active={sortBy === "accessCount"} direction={sortDir} onClick={() => toggleSort("accessCount")}>
            Opened
          </SortHeaderLabel>
        ),
        render: (row: SharedProfileRecord) => (
          <div className="leading-5">
            <p>{row.accessCount ?? 0} open{(row.accessCount ?? 0) === 1 ? "" : "s"}</p>
            <p className="text-xs text-[#667085]">{row.lastAccessedAt ? formatDate(row.lastAccessedAt) : "Never opened"}</p>
          </div>
        )
      },
      {
        key: "sharedAt",
        label: (
          <SortHeaderLabel active={sortBy === "sharedAt"} direction={sortDir} onClick={() => toggleSort("sharedAt")}>
            Shared On
          </SortHeaderLabel>
        ),
        render: (row: SharedProfileRecord) => formatDate(row.sharedAt)
      },
      {
        key: "actions",
        label: "",
        widthClassName: "w-[56px]",
        render: (row: SharedProfileRecord) => (
          <ActionMenu
            label={row.candidateName}
            isOpen={activeActionMenu === row.id}
            onToggle={() => setActiveActionMenu((previous) => (previous === row.id ? null : row.id))}
            onClose={() => setActiveActionMenu(null)}
            onCopyLink={() => void copySharedLink(row)}
            onResend={() => {
              setActiveActionMenu(null);
              void copySharedLink(row);
              showToast({ variant: "success", title: "Link copied for resend" });
            }}
            onEdit={() => {
              setActiveActionMenu(null);
              setEditing(row);
            }}
            onHistory={() => {
              setActiveActionMenu(null);
              setHistoryTarget(row);
            }}
            onRevoke={async () => {
              setActiveActionMenu(null);
              const updated = await revokeSharedProfile(row.id);
              resource.setData((previous) => ({
                ...previous,
                items: previous.items.map((item) => (item.id === updated.id ? updated : item))
              }));
              showToast({ variant: "success", title: "Shared link revoked" });
            }}
            canRevoke={!row.revokedAt}
          />
        )
      }
    ],
    [activeActionMenu, resource, showToast, sortBy, sortDir]
  );

  return (
    <AdminShell>
      <ModalShell
        open={Boolean(historyTarget)}
        title={historyTarget ? `Share History - ${historyTarget.candidateName}` : "Share History"}
        onClose={() => setHistoryTarget(null)}
        maxWidthClassName="max-w-[640px]"
      >
        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {historyRows.length === 0 ? (
            <p className="text-sm text-[#667085]">No history events yet.</p>
          ) : (
            historyRows.map((item) => (
              <div key={item.id} className="rounded-md border border-[#eaecf0] bg-[#f8fafc] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#242424]">{formatActionLabel(item.action)}</p>
                  <p className="text-xs text-[#667085]">{formatDate(item.createdAt)}</p>
                </div>
                <p className="mt-1 text-xs text-[#475467]">{item.actorEmail}</p>
              </div>
            ))
          )}
        </div>
      </ModalShell>
      <ModalShell
        open={Boolean(editing)}
        title="Adjust Shared Profile"
        onClose={() => setEditing(null)}
        maxWidthClassName="max-w-[520px]"
        showHeaderDivider={false}
      >
        <div className="flex flex-col gap-4">
          <FormInputField
            label="Rate"
            value={editRate}
            onChange={(value) => {
              setEditRate(value);
              setEditErrors((previous) => ({ ...previous, rate: undefined }));
            }}
            placeholder="$80 - Daily - All Days"
            error={editErrors.rate}
          />
          <FormInputField
            label="Link Expiration"
            type="date"
            value={editExpiration}
            onChange={(value) => {
              setEditExpiration(value);
              setEditErrors((previous) => ({ ...previous, expiration: undefined }));
            }}
            error={editErrors.expiration}
          />
          <div className="flex items-center gap-3">
            <Button variant="secondary" className="h-9 flex-1" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="h-9 flex-1"
              onClick={async () => {
                if (!editing) return;
                const nextErrors: { rate?: string; expiration?: string } = {};
                if (!editRate.trim()) nextErrors.rate = "Rate is required.";
                if (!editExpiration) {
                  nextErrors.expiration = "Expiration date is required.";
                }
                if (Object.keys(nextErrors).length > 0) {
                  setEditErrors(nextErrors);
                  return;
                }
                const updated = await updateSharedProfile(editing.id, {
                  shareToken: editing.shareToken,
                  candidateId: editing.candidateId,
                  candidateName: editing.candidateName,
                  candidateRole: editing.candidateRole,
                  sharedWithName: editing.sharedWithName,
                  sharedWithEmail: editing.sharedWithEmail,
                  rateLabel: editRate.trim(),
                  expirationDate: editExpiration,
                  sharedAt: editing.sharedAt
                });
                resource.setData((previous) => ({
                  ...previous,
                  items: previous.items.map((item) => (item.id === updated.id ? updated : item))
                }));
                setEditing(null);
                showToast({ variant: "success", title: "Shared profile updated" });
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </ModalShell>
      <div className="flex min-h-full flex-1 flex-col bg-white p-4 shadow-[0_10px_20px_rgba(148,163,184,0.2)]">
        <header className="sticky top-0 z-20 bg-white pb-3">
          <h1 className="text-xl font-semibold text-[#242424]">Shared Profiles</h1>
          <p className="mt-1 text-sm text-[#667085]">Track who received candidate profile links and when they expire.</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="w-[360px]">
              <FormInputField
                label="Search"
                value={query}
                onChange={setQuery}
                placeholder="Candidate or recipient"
              />
            </div>
            <div className="w-[220px]">
              <FormSelectField
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                options={[
                  { value: "all", label: "All" },
                  { value: "active", label: "Active" },
                  { value: "expired", label: "Expired" },
                  { value: "revoked", label: "Revoked" }
                ]}
              />
            </div>
          </div>
        </header>
        <main>
          {resource.error ? (
            <QueryErrorBanner
              error="Failed to load shared profiles. Please retry."
              onRetry={() => {
                void resource.refetch();
              }}
            />
          ) : null}
          {resource.isLoading && rows.length === 0 ? (
            <TableSkeleton rows={6} />
          ) : rows.length === 0 ? (
            <EmptyState title="No shared profiles yet" message="Shared candidate links will appear here." />
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              emptyMessage="No shared profiles yet."
            />
          )}
          <PaginationControls
            page={resource.data.page}
            totalPages={resource.data.totalPages}
            total={resource.data.total}
            pageSize={resource.data.pageSize}
            onPageChange={setPage}
          />
        </main>
      </div>
    </AdminShell>
  );
}
