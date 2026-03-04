import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AddCandidateModal } from "../components/AddCandidateModal";
import { StatusChip } from "../components/StatusChip";
import { AdminShell } from "../layout/AdminShell";
import { Button } from "../../../shared/components/Button";
import { ArrowRightIcon, FilterIcon, PlusIcon, SearchIcon } from "../../../shared/components/Icons";
import { RowActionsButton } from "../../../shared/components/RowActionsButton";
import { SortHeaderLabel } from "../../../shared/components/SortHeaderLabel";
import { DataTable } from "../../../shared/components/Table";
import { FormSelectField } from "../../../shared/components/FormSelectField";
import { useToast } from "../../../shared/components/ToastProvider";
import { FloatingPopover } from "../../../shared/components/FloatingPopover";
import { EmptyState, QueryErrorBanner, TableSkeleton } from "../../../shared/components/QueryStates";
import { ModalShell } from "../../../shared/components/ModalShell";
import {
  addCandidate,
    CandidateRecord,
    CandidateListQuery,
    createCandidateInviteLink,
    deleteCandidate,
  fetchCandidatesPage,
  slugifyName,
  updateCandidate
} from "../data/candidatesDb";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import { useQueryResource } from "../../../shared/hooks/useQueryResource";
import { APP_ROUTES } from "../../../shared/config/routes";
import { PaginationControls } from "../../../shared/components/PaginationControls";
import type { PaginatedResult } from "../../../shared/types/pagination";

function ActionMenu({
  isOpen,
  onToggle,
  onCandidate,
  onEdit,
  onCopyLink,
  onDelete,
  label
}: {
  isOpen: boolean;
  onToggle: () => void;
  onCandidate: () => void;
  onEdit: () => void;
  onCopyLink: () => void;
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
        className="w-36 rounded-md border border-[#dbe3ea] bg-white py-1 text-left shadow-[0_6px_14px_rgba(15,23,42,0.12)]"
        onRequestClose={onToggle}
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
              onCandidate();
            }}
          >
            Candidate
          </button>
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
            className="block w-full px-3 py-2 text-left text-sm text-[#ef4444] hover:bg-[#fef2f2]"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            Remove
          </button>
        </div>
      </FloatingPopover>
    </div>
  );
}

export function CandidatesPage() {
  const PAGE_SIZE = 12;
  const toggleSort = (nextSortBy: NonNullable<CandidateListQuery["sortBy"]>) => {
    setSortBy((previousSortBy) => {
      if (previousSortBy === nextSortBy) {
        setSortDir((previousDir) => (previousDir === "asc" ? "desc" : "asc"));
        return previousSortBy;
      }
      setSortDir("asc");
      return nextSortBy;
    });
  };
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<CandidateRecord | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState("all");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<CandidateRecord | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<CandidateListQuery["sortBy"]>("name");
  const [sortDir, setSortDir] = useState<CandidateListQuery["sortDir"]>("asc");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const debouncedSearch = useDebouncedValue(searchInput, 180);
  const { showToast } = useToast();
  const searchFieldRef = useRef<HTMLInputElement | null>(null);
  const filterTriggerRef = useRef<HTMLDivElement | null>(null);
  const initialCandidatesPage = useMemo(
    () => ({
      items: [],
      page: 1,
      pageSize: PAGE_SIZE,
      total: 0,
      totalPages: 1
    }),
    []
  );

  const candidatesResource = useQueryResource<PaginatedResult<CandidateRecord>>({
    initialData: initialCandidatesPage,
    fetcher: () =>
      fetchCandidatesPage({
        page,
        pageSize: PAGE_SIZE,
        q: debouncedSearch.trim(),
        status: statusFilter,
        availability: availabilityFilter,
        role: roleFilter,
        progress: progressFilter,
        sortBy,
        sortDir
      }),
    deps: [page, debouncedSearch, statusFilter, availabilityFilter, roleFilter, progressFilter, sortBy, sortDir]
  });
  const candidates = candidatesResource.data.items;
  const setCandidates = candidatesResource.setData;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, availabilityFilter, roleFilter, progressFilter, sortBy, sortDir]);

  const copyPreviewLink = async (candidateId: string) => {
    const url = `${window.location.origin}${APP_ROUTES.customer.candidatePreview(candidateId)}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast({ variant: "success", title: "Preview link copied" });
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
        showToast({ variant: "success", title: "Preview link copied" });
      } catch {
        showToast({ variant: "error", title: "Failed to copy link" });
      }
    }
  };

  useEffect(() => {
    if (!isSearchExpanded) return;
    searchFieldRef.current?.focus();
  }, [isSearchExpanded]);

  useEffect(() => {
    const status = searchParams.get("status");
    const availability = searchParams.get("availability");
    const role = searchParams.get("role");
    const progress = searchParams.get("progress");
    const query = searchParams.get("q");

    setStatusFilter(status ?? "all");
    setAvailabilityFilter(availability ?? "all");
    setRoleFilter(role ?? "all");
    setProgressFilter(progress ?? "all");
    setSearchInput(query ?? "");
    setIsSearchExpanded(Boolean(query));
  }, [searchParams]);

  const roleOptions = useMemo(
    () => ["all", ...new Set(candidates.map((candidate) => candidate.role).filter(Boolean))],
    [candidates]
  );

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: (
          <SortHeaderLabel active={sortBy === "name"} direction={sortDir} onClick={() => toggleSort("name")}>
            Candidate Name
          </SortHeaderLabel>
        ),
        render: (row: CandidateRecord) => row.name
      },
      {
        key: "role",
        label: (
          <SortHeaderLabel active={sortBy === "role"} direction={sortDir} onClick={() => toggleSort("role")}>
            Role
          </SortHeaderLabel>
        ),
        render: (row: CandidateRecord) => row.role
      },
      {
        key: "technologies",
        label: (
          <SortHeaderLabel active={sortBy === "technologies"} direction={sortDir} onClick={() => toggleSort("technologies")}>
            Technologies
          </SortHeaderLabel>
        ),
        render: (row: CandidateRecord) => row.technologies
      },
      {
        key: "salary",
        label: (
          <SortHeaderLabel active={sortBy === "expectedSalary"} direction={sortDir} onClick={() => toggleSort("expectedSalary")}>
            Expected Salary
          </SortHeaderLabel>
        ),
        render: (row: CandidateRecord) => row.expectedSalary
      },
      {
        key: "available",
        label: (
          <SortHeaderLabel active={sortBy === "available"} direction={sortDir} onClick={() => toggleSort("available")}>
            Available
          </SortHeaderLabel>
        ),
        render: (row: CandidateRecord) => row.available
      },
      {
        key: "status",
        label: (
          <SortHeaderLabel active={sortBy === "status"} direction={sortDir} onClick={() => toggleSort("status")}>
            Status
          </SortHeaderLabel>
        ),
        widthClassName: "w-[120px]",
        render: (row: CandidateRecord) => <StatusChip status={row.status} />
      },
      {
        key: "actions",
        label: "",
        widthClassName: "w-[56px]",
        render: (row: CandidateRecord) => {
          const key = `candidate:${row.id}`;
          return (
            <ActionMenu
              label={row.name}
              isOpen={activeActionMenu === key}
              onToggle={() => setActiveActionMenu((previous) => (previous === key ? null : key))}
              onEdit={() => {
                setActiveActionMenu(null);
                setEditingCandidate(row);
                setIsAddCandidateOpen(true);
              }}
              onCandidate={() => {
                setActiveActionMenu(null);
                void (async () => {
                  try {
                    const invite = await createCandidateInviteLink(row.id);
                    window.open(APP_ROUTES.candidate.start(invite.token), "_blank", "noopener,noreferrer");
                  } catch (error) {
                    showToast({
                      variant: "error",
                      title: "Failed to generate candidate link",
                      message: error instanceof Error ? error.message : undefined
                    });
                  }
                })();
              }}
              onCopyLink={async () => {
                setActiveActionMenu(null);
                await copyPreviewLink(row.id);
              }}
              onDelete={async () => {
                setActiveActionMenu(null);
                setCandidateToDelete(row);
              }}
            />
          );
        }
      }
    ],
    [activeActionMenu, showToast, sortBy, sortDir]
  );

  return (
    <AdminShell>
      <ModalShell
        open={Boolean(candidateToDelete)}
        title="Remove Candidate"
        onClose={() => setCandidateToDelete(null)}
        maxWidthClassName="max-w-[420px]"
      >
        <p className="text-sm leading-5 text-[#475467]">
          {candidateToDelete
            ? `Are you sure you want to remove ${candidateToDelete.name}? This action cannot be undone.`
            : "Are you sure you want to remove this candidate?"}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Button variant="secondary" className="h-9 flex-1" onClick={() => setCandidateToDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            className="h-9 flex-1 bg-[#fef2f2] text-[#ef4444] hover:bg-[#fee2e2]"
            onClick={async () => {
              if (!candidateToDelete) return;
              try {
                await deleteCandidate(candidateToDelete.id);
                setCandidates((previous) => ({
                  ...previous,
                  items: previous.items.filter((item) => item.id !== candidateToDelete.id),
                  total: Math.max(0, previous.total - 1),
                  totalPages: Math.max(1, Math.ceil(Math.max(0, previous.total - 1) / previous.pageSize))
                }));
                showToast({ variant: "success", title: "Candidate removed" });
              } catch {
                showToast({ variant: "error", title: "Failed to remove candidate" });
              } finally {
                setCandidateToDelete(null);
              }
            }}
          >
            Remove
          </Button>
        </div>
      </ModalShell>
      <AddCandidateModal
        open={isAddCandidateOpen}
        mode={editingCandidate ? "edit" : "add"}
        initialCandidate={editingCandidate}
        onClose={() => {
          setIsAddCandidateOpen(false);
          setEditingCandidate(null);
        }}
        onAddCandidate={async (candidate) => {
          try {
            if (editingCandidate) {
              const updated = await updateCandidate(editingCandidate.id, candidate);
              setCandidates((previous) => ({
                ...previous,
                items: [updated, ...previous.items.filter((item) => item.id !== updated.id)]
              }));
              showToast({ variant: "success", title: "Candidate updated" });
              return;
            }

            const created = await addCandidate(candidate);
            setCandidates((previous) => ({
              ...previous,
              items: [created, ...previous.items.filter((item) => item.id !== slugifyName(candidate.name))],
              total: previous.total + 1,
              totalPages: Math.max(1, Math.ceil((previous.total + 1) / previous.pageSize))
            }));
            showToast({ variant: "success", title: "Candidate added" });
          } catch (error) {
            showToast({
              variant: "error",
              title: "Failed to save candidate",
              message: error instanceof Error ? error.message : undefined
            });
          }
        }}
      />
      <div className="flex min-h-full flex-1 flex-col bg-white p-4 shadow-[0_10px_20px_rgba(148,163,184,0.2)]">
        <header className="sticky top-0 z-20 flex justify-end bg-white pb-2">
          <div className="flex items-center gap-4">
            <div
              className={`overflow-hidden transition-all duration-200 ${
                isSearchExpanded ? "w-[280px] opacity-100" : "w-0 opacity-0"
              }`}
            >
              <div className="flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3">
                <SearchIcon className="h-4 w-4 text-[#667085]" />
                <input
                  ref={searchFieldRef}
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search by name, role, tech"
                  className="h-full w-full bg-transparent text-sm text-[#344054] outline-none placeholder:text-[#98a2b3]"
                />
              </div>
            </div>
            <Button
              variant="icon"
              className="h-9 w-9"
              aria-label="Search"
              onClick={() => setIsSearchExpanded((previous) => !previous)}
            >
              <SearchIcon className="h-4 w-4" />
            </Button>
            <div ref={filterTriggerRef} className="relative">
              <Button
                variant="icon"
                className="h-9 w-9"
                aria-label="Filter"
                onClick={() => setIsFilterOpen((previous) => !previous)}
              >
                <FilterIcon className="h-4 w-4" />
              </Button>
              <FloatingPopover
                open={isFilterOpen}
                anchorRef={filterTriggerRef}
                align="end"
                className="w-[320px] rounded-lg border border-[#dbe3ea] bg-white p-3 shadow-[0_10px_20px_rgba(15,23,42,0.12)]"
                onRequestClose={() => setIsFilterOpen(false)}
              >
                <div>
                  <div className="space-y-3">
                    <FormSelectField
                      label="Status"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      options={[
                        { label: "All", value: "all" },
                        { label: "Active", value: "Active" },
                        { label: "Inactive", value: "Inactive" },
                        { label: "Pending", value: "Pending" }
                      ]}
                    />
                    <FormSelectField
                      label="Availability"
                      value={availabilityFilter}
                      onChange={(event) => setAvailabilityFilter(event.target.value)}
                      options={[
                        { label: "All", value: "all" },
                        { label: "Available Now", value: "yes" },
                        { label: "Not Immediate", value: "later" }
                      ]}
                    />
                    <FormSelectField
                      label="Role"
                      value={roleFilter}
                      onChange={(event) => setRoleFilter(event.target.value)}
                      options={roleOptions.map((role) => ({
                        label: role === "all" ? "All" : role,
                        value: role
                      }))}
                    />
                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="whitespace-nowrap"
                        onClick={() => {
                          setSearchInput("");
                          setStatusFilter("all");
                          setAvailabilityFilter("all");
                          setRoleFilter("all");
                          setProgressFilter("all");
                          setSortBy("name");
                          setSortDir("asc");
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </div>
              </FloatingPopover>
            </div>
            <Button
              variant="primary"
              startIcon={<PlusIcon className="h-4 w-4" />}
              endIcon={<ArrowRightIcon className="h-4 w-4" />}
              onClick={() => {
                setEditingCandidate(null);
                setIsAddCandidateOpen(true);
              }}
            >
              Add Candidate
            </Button>
          </div>
        </header>

        <main className="pt-2">
          {candidatesResource.error ? (
            <QueryErrorBanner
              error="Failed to load candidates. Check your connection and retry."
              onRetry={() => {
                void candidatesResource.refetch();
              }}
            />
          ) : null}
          {candidatesResource.isLoading && candidates.length === 0 ? (
            <TableSkeleton rows={8} />
          ) : candidates.length === 0 ? (
            <EmptyState title="No candidates found" message="Try updating your search or filters." />
          ) : (
            <DataTable
              columns={columns}
              rows={candidates}
              rowKey={(row) => row.id}
              allowOverflow
              emptyMessage="No candidates found."
              onRowClick={(row) => navigate(APP_ROUTES.admin.candidateProfile(row.id))}
            />
          )}
          <PaginationControls
            page={candidatesResource.data.page}
            totalPages={candidatesResource.data.totalPages}
            total={candidatesResource.data.total}
            pageSize={candidatesResource.data.pageSize}
            onPageChange={setPage}
          />
        </main>
      </div>
    </AdminShell>
  );
}
