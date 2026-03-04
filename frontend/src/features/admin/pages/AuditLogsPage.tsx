import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "../layout/AdminShell";
import { DataTable } from "../../../shared/components/Table";
import { SortHeaderLabel } from "../../../shared/components/SortHeaderLabel";
import { useQueryResource } from "../../../shared/hooks/useQueryResource";
import { AuditLogRecord, fetchAuditLogsPage } from "../data/auditLogsDb";
import { FormSelectField } from "../../../shared/components/FormSelectField";
import { EmptyState, QueryErrorBanner, TableSkeleton } from "../../../shared/components/QueryStates";
import { FormInputField } from "../../../shared/components/FormInputField";
import { PaginationControls } from "../../../shared/components/PaginationControls";
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
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "action" | "entityType" | "entityId" | "actorEmail">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
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
        q: query.trim(),
        action: actionFilter,
        entity: entityFilter,
        sortBy,
        sortDir
      }),
    deps: [page, query, actionFilter, entityFilter, sortBy, sortDir]
  });

  useEffect(() => {
    setPage(1);
  }, [actionFilter, entityFilter, query, sortBy, sortDir]);
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
        <header className="sticky top-0 z-20 bg-white pb-3">
          <h1 className="text-xl font-semibold text-[#242424]">Audit Logs</h1>
          <p className="mt-1 text-sm text-[#667085]">Track who changed what across candidates, skills, and sharing.</p>
        </header>

        <section className="mb-3 mt-1 flex flex-wrap items-end gap-3">
          <div className="w-[360px]">
            <FormInputField label="Search" value={query} onChange={setQuery} placeholder="Action, entity, or actor" />
          </div>
          <div className="w-[220px]">
            <FormSelectField
              label="Action"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              options={actionOptions.map((option) => ({
                value: option,
                label: option === "all" ? "All actions" : option
              }))}
            />
          </div>
          <div className="w-[220px]">
            <FormSelectField
              label="Entity"
              value={entityFilter}
              onChange={(event) => setEntityFilter(event.target.value)}
              options={entityOptions.map((option) => ({
                value: option,
                label: option === "all" ? "All entities" : option
              }))}
            />
          </div>
        </section>

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
