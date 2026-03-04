import { useEffect, useMemo, useRef, useState } from "react";
import { AdminShell } from "../layout/AdminShell";
import { DataTable } from "../../../shared/components/Table";
import { SortHeaderLabel } from "../../../shared/components/SortHeaderLabel";
import { useQueryResource } from "../../../shared/hooks/useQueryResource";
import { AuditLogRecord, fetchAuditLogsPage } from "../data/auditLogsDb";
import { FormSelectField } from "../../../shared/components/FormSelectField";
import { EmptyState, QueryErrorBanner, TableSkeleton } from "../../../shared/components/QueryStates";
import { PaginationControls } from "../../../shared/components/PaginationControls";
import { Button } from "../../../shared/components/Button";
import { FilterIcon, SearchIcon } from "../../../shared/components/Icons";
import { FloatingPopover } from "../../../shared/components/FloatingPopover";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import type { PaginatedResult } from "../../../shared/types/pagination";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function AuditLogsPage() {
  const PAGE_SIZE = 12;
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"createdAt" | "action" | "entityType" | "entityId" | "actorEmail">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const searchFieldRef = useRef<HTMLInputElement | null>(null);
  const filterTriggerRef = useRef<HTMLDivElement | null>(null);
  const debouncedSearch = useDebouncedValue(searchInput, 180);
  const toggleSort = (nextSortBy: "createdAt" | "action" | "entityType" | "entityId" | "actorEmail") => {
    setSortBy((previousSortBy) => {
      if (previousSortBy === nextSortBy) {
        setSortDir((previousDir) => (previousDir === "asc" ? "desc" : "asc"));
        return previousSortBy;
      }
      setSortDir("asc");
      return nextSortBy;
    });
  };

  const resource = useQueryResource<PaginatedResult<AuditLogRecord>>({
    initialData: { items: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 },
    fetcher: () =>
      fetchAuditLogsPage({
        page,
        pageSize: PAGE_SIZE,
        q: debouncedSearch.trim(),
        action: actionFilter,
        entity: entityFilter,
        sortBy,
        sortDir
      }),
    deps: [page, debouncedSearch, actionFilter, entityFilter, sortBy, sortDir]
  });

  useEffect(() => {
    if (!isSearchExpanded) return;
    searchFieldRef.current?.focus();
  }, [isSearchExpanded]);

  useEffect(() => {
    setPage(1);
  }, [actionFilter, entityFilter, debouncedSearch, sortBy, sortDir]);
  const rows = resource.data.items;

  const actionOptions = useMemo(
    () => ["all", ...new Set(resource.data.items.map((row) => row.action))],
    [resource.data.items]
  );
  const entityOptions = useMemo(
    () => ["all", ...new Set(resource.data.items.map((row) => row.entityType))],
    [resource.data.items]
  );

  const columns = useMemo(
    () => [
      {
        key: "createdAt",
        label: (
          <SortHeaderLabel active={sortBy === "createdAt"} direction={sortDir} onClick={() => toggleSort("createdAt")}>
            When
          </SortHeaderLabel>
        ),
        widthClassName: "w-[180px]",
        render: (row: AuditLogRecord) => <span className="text-xs">{formatDateTime(row.createdAt)}</span>
      },
      {
        key: "actor",
        label: (
          <SortHeaderLabel active={sortBy === "actorEmail"} direction={sortDir} onClick={() => toggleSort("actorEmail")}>
            Actor
          </SortHeaderLabel>
        ),
        widthClassName: "w-[210px]",
        render: (row: AuditLogRecord) => (
          <div className="leading-5">
            <p className="text-sm text-[#242424]">{row.actorEmail}</p>
            <p className="text-xs text-[#667085]">{row.actorRole}</p>
          </div>
        )
      },
      {
        key: "action",
        label: (
          <SortHeaderLabel active={sortBy === "action"} direction={sortDir} onClick={() => toggleSort("action")}>
            Action
          </SortHeaderLabel>
        ),
        widthClassName: "w-[180px]",
        render: (row: AuditLogRecord) => row.action
      },
      {
        key: "entityType",
        label: (
          <SortHeaderLabel active={sortBy === "entityType"} direction={sortDir} onClick={() => toggleSort("entityType")}>
            Entity
          </SortHeaderLabel>
        ),
        widthClassName: "w-[140px]",
        render: (row: AuditLogRecord) => row.entityType
      },
      {
        key: "entityId",
        label: (
          <SortHeaderLabel active={sortBy === "entityId"} direction={sortDir} onClick={() => toggleSort("entityId")}>
            Entity ID
          </SortHeaderLabel>
        ),
        render: (row: AuditLogRecord) => <span className="font-mono text-xs">{row.entityId}</span>
      }
    ],
    [sortBy, sortDir]
  );

  return (
    <AdminShell>
      <div className="flex min-h-full flex-1 flex-col bg-white p-4 shadow-[0_10px_20px_rgba(148,163,184,0.2)]">
        <header className="sticky top-0 z-20 flex items-start justify-between bg-white pb-3">
          <div>
            <h1 className="text-xl font-semibold text-[#242424]">Audit Logs</h1>
            <p className="mt-1 text-sm text-[#667085]">Track who changed what across candidates, skills, and sharing.</p>
          </div>
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
                  placeholder="Search action, entity, actor"
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
                <div className="space-y-3">
                  <FormSelectField
                    label="Action"
                    value={actionFilter}
                    onChange={(event) => setActionFilter(event.target.value)}
                    options={actionOptions.map((option) => ({
                      value: option,
                      label: option === "all" ? "All actions" : option
                    }))}
                  />
                  <FormSelectField
                    label="Entity"
                    value={entityFilter}
                    onChange={(event) => setEntityFilter(event.target.value)}
                    options={entityOptions.map((option) => ({
                      value: option,
                      label: option === "all" ? "All entities" : option
                    }))}
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="whitespace-nowrap"
                      onClick={() => {
                        setSearchInput("");
                        setActionFilter("all");
                        setEntityFilter("all");
                        setSortBy("createdAt");
                        setSortDir("desc");
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </FloatingPopover>
            </div>
          </div>
        </header>

        <main>
          {resource.error ? (
            <QueryErrorBanner
              error="Failed to load audit logs. Please retry."
              onRetry={() => {
                void resource.refetch();
              }}
            />
          ) : null}
          {resource.isLoading && resource.data.items.length === 0 ? (
            <TableSkeleton rows={8} />
          ) : rows.length === 0 ? (
            <EmptyState title="No audit log entries yet" message="Actions across the app will appear here." />
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              emptyMessage="No audit log entries yet."
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
