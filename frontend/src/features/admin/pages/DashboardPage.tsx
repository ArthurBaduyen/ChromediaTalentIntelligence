import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AdminShell } from "../layout/AdminShell";
import { CandidateRecord, fetchCandidates } from "../data/candidatesDb";
import { fetchSkillsState, SkillsState } from "../data/skillsDb";
import { fetchSharedProfiles, SharedProfileRecord } from "../data/sharedProfilesDb";
import { useQueryResource } from "../../../shared/hooks/useQueryResource";
import { DataTable } from "../../../shared/components/Table";
import { SortHeaderLabel } from "../../../shared/components/SortHeaderLabel";
import { APP_ROUTES, withQuery } from "../../../shared/config/routes";
import { EmptyState, QueryErrorBanner, TableSkeleton } from "../../../shared/components/QueryStates";

type CandidateLifecycle = {
  invited: number;
  started: number;
  inProgress: number;
  completed: number;
};

type SubmissionProgress = "invited" | "started" | "in-progress" | "completed";

type CandidateCompletenessRow = {
  id: string;
  name: string;
  role: string;
  score: number;
};

type AlertRow = {
  id: string;
  label: string;
  severity: "high" | "medium" | "low";
  count: number;
};

type RoleGapRow = {
  id: string;
  role: string;
  demand: number;
  availableNow: number;
  gap: number;
};

type SkillGapRow = {
  id: string;
  category: string;
  unfilledCount: number;
};

type ActivityRow = {
  id: string;
  when: string;
  event: string;
  actor: string;
};

type WeekStats = {
  newCandidatesDelta: number;
  completedProfilesDelta: number;
  sharedProfilesDelta: number;
  sharedOpensDelta: number;
};

type FunnelStageData = {
  id: SubmissionProgress;
  label: string;
  count: number;
};

type SharedPerformancePoint = {
  label: string;
  shares: number;
  opens: number;
};

function daysAgoIso(days: number) {
  const now = new Date();
  now.setDate(now.getDate() - days);
  return now.toISOString();
}

function isWithinRange(dateValue: string | undefined, fromInclusive: Date, toExclusive: Date) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date >= fromInclusive && date < toExclusive;
}

function clampPct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toDayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function daysUntil(dateValue: string | undefined) {
  if (!dateValue) return null;
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const diff = toDayStart(target) - toDayStart(now);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function sharedStatus(record: SharedProfileRecord): "active" | "expired" | "revoked" {
  if (record.revokedAt) return "revoked";
  const remaining = daysUntil(record.expirationDate);
  if (remaining === null || remaining < 0) return "expired";
  return "active";
}

function computeCompleteness(candidate: CandidateRecord) {
  const profile = candidate.profile;
  if (!profile) return 0;

  const checks = [
    Boolean(profile.about?.trim()),
    Boolean(profile.experience?.trim()),
    (profile.education?.length ?? 0) > 0,
    (profile.projects?.length ?? 0) > 0,
    Boolean(profile.videoTitle?.trim() || profile.videoUrl?.trim()),
    (profile.skillSelections?.some((selection) => selection.selectedSubSkills.length > 0) ?? false)
  ];

  const met = checks.filter(Boolean).length;
  return clampPct((met / checks.length) * 100);
}

function computeLifecycle(candidates: CandidateRecord[]): CandidateLifecycle {
  let invited = 0;
  let started = 0;
  let inProgress = 0;
  let completed = 0;

  for (const candidate of candidates) {
    const stage = getSubmissionProgress(candidate);
    if (stage === "invited") invited += 1;
    if (stage === "started") started += 1;
    if (stage === "in-progress") inProgress += 1;
    if (stage === "completed") completed += 1;
  }

  return {
    invited,
    started,
    inProgress,
    completed
  };
}

function getSubmissionProgress(candidate: CandidateRecord): SubmissionProgress {
  const selections = candidate.profile?.skillSelections ?? [];
  if (selections.length === 0) return "invited";

  const filledGroups = selections.filter((selection) => selection.selectedSubSkills.length > 0).length;
  if (filledGroups === 0) return "invited";
  if (filledGroups === selections.length) return "completed";
  if (filledGroups === 1) return "started";
  return "in-progress";
}

function formatDelta(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value} vs previous week`;
}

function metricCard({
  title,
  value,
  subtitle,
  onClick
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border border-[#e2e8f0] bg-white p-4 text-left shadow-[0_2px_8px_rgba(15,23,42,0.04)] ${
        onClick ? "hover:border-[#1595d4]" : "cursor-default"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-[0.02em] text-[#64748b]">{title}</p>
      <p className="mt-2 text-[28px] font-semibold leading-8 text-[#0f172a]">{value}</p>
      {subtitle ? <p className="mt-2 text-xs text-[#667085]">{subtitle}</p> : null}
    </button>
  );
}

function statusBadge(severity: AlertRow["severity"]) {
  if (severity === "high") return "bg-[#fef2f2] text-[#b42318]";
  if (severity === "medium") return "bg-[#fffaeb] text-[#b54708]";
  return "bg-[#ecfdf3] text-[#027a48]";
}

function formatShortDate(value: Date) {
  return value.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildSharedPerformanceSeries(records: SharedProfileRecord[], weeks = 8): SharedPerformancePoint[] {
  const now = new Date();
  const weekAnchor = new Date(now);
  weekAnchor.setHours(0, 0, 0, 0);
  weekAnchor.setDate(weekAnchor.getDate() - weekAnchor.getDay());

  const result: SharedPerformancePoint[] = [];
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const start = new Date(weekAnchor);
    start.setDate(start.getDate() - index * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const shares = records.filter((item) => isWithinRange(item.sharedAt, start, end)).length;
    const opens = records.reduce((sum, item) => {
      if (!isWithinRange(item.lastAccessedAt, start, end)) return sum;
      return sum + Math.max(1, Number(item.accessCount ?? 0));
    }, 0);

    result.push({
      label: formatShortDate(start),
      shares,
      opens
    });
  }

  return result;
}

function FunnelChart({
  stages,
  onStageClick
}: {
  stages: FunnelStageData[];
  onStageClick: (stage: SubmissionProgress) => void;
}) {
  const maxCount = Math.max(1, ...stages.map((stage) => stage.count));
  const colors = ["#1d4ed8", "#1595d4", "#06b6d4", "#0ea5a0"];

  return (
    <article className="rounded-lg border border-[#e2e8f0] bg-white p-4">
      <h2 className="mb-1 text-base font-semibold leading-6 text-[#0f172a]">Candidate Funnel</h2>
      <p className="mb-4 text-xs text-[#667085]">Invited to completed submission flow</p>
      <div className="space-y-2">
        {stages.map((stage, index) => {
          const widthPercent = Math.max(36, Math.round((stage.count / maxCount) * 100));
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onStageClick(stage.id)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition hover:opacity-90"
              style={{ width: `${widthPercent}%`, backgroundColor: colors[index] ?? "#1595d4" }}
            >
              <span className="text-sm font-medium text-white">{stage.label}</span>
              <span className="text-sm font-semibold text-white">{stage.count}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function SharedPerformanceChart({ points }: { points: SharedPerformancePoint[] }) {
  if (points.length === 0) {
    return (
      <article className="rounded-lg border border-[#e2e8f0] bg-white p-4">
        <h2 className="mb-1 text-base font-semibold leading-6 text-[#0f172a]">Shared Profile Performance</h2>
        <p className="text-sm text-[#667085]">No sharing activity yet.</p>
      </article>
    );
  }

  const width = 700;
  const height = 240;
  const left = 36;
  const right = 16;
  const top = 16;
  const bottom = 38;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxY = Math.max(1, ...points.map((point) => Math.max(point.shares, point.opens)));
  const xStep = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;

  const toY = (value: number) => top + chartHeight - (value / maxY) * chartHeight;
  const linePoints = points
    .map((point, index) => `${left + xStep * index},${toY(point.opens)}`)
    .join(" ");
  const barWidth = Math.min(36, chartWidth / Math.max(points.length * 1.8, 1));

  return (
    <article className="rounded-lg border border-[#e2e8f0] bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold leading-6 text-[#0f172a]">Shared Profile Performance</h2>
          <p className="text-xs text-[#667085]">Weekly shares (bars) and link opens (line)</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#667085]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#93c5fd]" /> Shares
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1595d4]" /> Opens
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[240px] w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = top + chartHeight - tick * chartHeight;
          return (
            <line
              key={tick}
              x1={left}
              y1={y}
              x2={left + chartWidth}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          );
        })}
        {points.map((point, index) => {
          const x = left + xStep * index;
          const barHeight = (point.shares / maxY) * chartHeight;
          return (
            <g key={`${point.label}-${index}`}>
              <rect
                x={x - barWidth / 2}
                y={top + chartHeight - barHeight}
                width={barWidth}
                height={Math.max(2, barHeight)}
                rx="4"
                fill="#93c5fd"
              />
              <text x={x} y={height - 12} textAnchor="middle" className="fill-[#64748b] text-[10px]">
                {point.label}
              </text>
            </g>
          );
        })}
        <polyline fill="none" stroke="#1595d4" strokeWidth="2.5" points={linePoints} />
        {points.map((point, index) => {
          const x = left + xStep * index;
          const y = toY(point.opens);
          return <circle key={`open-${point.label}-${index}`} cx={x} cy={y} r="3.5" fill="#1595d4" />;
        })}
      </svg>
    </article>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const candidatesResource = useQueryResource<CandidateRecord[]>({
    initialData: [],
    fetcher: fetchCandidates
  });
  const skillsResource = useQueryResource<SkillsState>({
    initialData: { categories: [] },
    fetcher: fetchSkillsState
  });
  const sharedProfilesResource = useQueryResource<SharedProfileRecord[]>({
    initialData: [],
    fetcher: fetchSharedProfiles
  });

  const candidates = candidatesResource.data;
  const skillsState = skillsResource.data;
  const sharedProfiles = sharedProfilesResource.data;
  const isInitialLoading =
    (candidatesResource.isLoading && candidates.length === 0) ||
    (skillsResource.isLoading && skillsState.categories.length === 0) ||
    (sharedProfilesResource.isLoading && sharedProfiles.length === 0);

  const totals = useMemo(() => {
    const totalCandidates = candidates.length;
    const activeCandidates = candidates.filter((candidate) => candidate.status === "Active").length;
    const pendingCandidates = candidates.filter((candidate) => candidate.status === "Pending").length;
    const inactiveCandidates = candidates.filter((candidate) => candidate.status === "Inactive").length;

    const totalCategories = skillsState.categories.length;
    const totalSkills = skillsState.categories.reduce((sum, category) => sum + category.skills.length, 0);
    const totalCapabilities = skillsState.categories.reduce(
      (sum, category) =>
        sum +
        category.skills.reduce(
          (skillSum, skill) => skillSum + skill.capabilities.reduce((capabilitySum, group) => capabilitySum + group.entries.length, 0),
          0
        ),
      0
    );

    return {
      totalCandidates,
      activeCandidates,
      pendingCandidates,
      inactiveCandidates,
      totalCategories,
      totalSkills,
      totalCapabilities
    };
  }, [candidates, skillsState.categories]);

  const lifecycle = useMemo(() => computeLifecycle(candidates), [candidates]);

  const sharedOverview = useMemo(() => {
    const active = sharedProfiles.filter((item) => sharedStatus(item) === "active").length;
    const expired = sharedProfiles.filter((item) => sharedStatus(item) === "expired").length;
    const revoked = sharedProfiles.filter((item) => sharedStatus(item) === "revoked").length;
    const expiringSoon = sharedProfiles.filter((item) => {
      const remaining = daysUntil(item.expirationDate);
      return remaining !== null && remaining >= 0 && remaining <= 7 && sharedStatus(item) === "active";
    }).length;
    const opens = sharedProfiles.reduce((sum, item) => sum + Math.max(0, Number(item.accessCount ?? 0)), 0);
    return {
      total: sharedProfiles.length,
      active,
      expired,
      revoked,
      expiringSoon,
      opens
    };
  }, [sharedProfiles]);

  const completenessRows = useMemo<CandidateCompletenessRow[]>(() => {
    return candidates
      .map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        role: candidate.role,
        score: computeCompleteness(candidate)
      }))
      .sort((a, b) => b.score - a.score);
  }, [candidates]);

  const averageCompleteness = useMemo(() => {
    if (completenessRows.length === 0) return 0;
    return clampPct(completenessRows.reduce((sum, row) => sum + row.score, 0) / completenessRows.length);
  }, [completenessRows]);

  const weekly = useMemo<WeekStats>(() => {
    const now = new Date();
    const thisWeekStart = new Date(daysAgoIso(7));
    const prevWeekStart = new Date(daysAgoIso(14));

    const newThisWeek = candidates.filter((candidate) => isWithinRange(candidate.createdAt, thisWeekStart, now)).length;
    const newPrevWeek = candidates.filter((candidate) => isWithinRange(candidate.createdAt, prevWeekStart, thisWeekStart)).length;

    const isCompleted = (candidate: CandidateRecord) => {
      const selections = candidate.profile?.skillSelections ?? [];
      return selections.length > 0 && selections.every((selection) => selection.selectedSubSkills.length > 0);
    };

    const completedThisWeek = candidates.filter(
      (candidate) => isCompleted(candidate) && isWithinRange(candidate.updatedAt, thisWeekStart, now)
    ).length;
    const completedPrevWeek = candidates.filter(
      (candidate) => isCompleted(candidate) && isWithinRange(candidate.updatedAt, prevWeekStart, thisWeekStart)
    ).length;

    const sharedThisWeek = sharedProfiles.filter((item) => isWithinRange(item.sharedAt, thisWeekStart, now)).length;
    const sharedPrevWeek = sharedProfiles.filter((item) => isWithinRange(item.sharedAt, prevWeekStart, thisWeekStart)).length;
    const opensThisWeek = sharedProfiles
      .filter((item) => isWithinRange(item.lastAccessedAt, thisWeekStart, now))
      .reduce((sum, item) => sum + Math.max(0, Number(item.accessCount ?? 0)), 0);
    const opensPrevWeek = sharedProfiles
      .filter((item) => isWithinRange(item.lastAccessedAt, prevWeekStart, thisWeekStart))
      .reduce((sum, item) => sum + Math.max(0, Number(item.accessCount ?? 0)), 0);

    return {
      newCandidatesDelta: newThisWeek - newPrevWeek,
      completedProfilesDelta: completedThisWeek - completedPrevWeek,
      sharedProfilesDelta: sharedThisWeek - sharedPrevWeek,
      sharedOpensDelta: opensThisWeek - opensPrevWeek
    };
  }, [candidates, sharedProfiles]);

  const completionRate = useMemo(() => {
    if (candidates.length === 0) return 0;
    return clampPct((lifecycle.completed / candidates.length) * 100);
  }, [candidates.length, lifecycle.completed]);

  const funnelStages = useMemo<FunnelStageData[]>(
    () => [
      { id: "invited", label: "Invited", count: lifecycle.invited },
      { id: "started", label: "Started", count: lifecycle.started },
      { id: "in-progress", label: "In Progress", count: lifecycle.inProgress },
      { id: "completed", label: "Completed", count: lifecycle.completed }
    ],
    [lifecycle.completed, lifecycle.inProgress, lifecycle.invited, lifecycle.started]
  );

  const sharedPerformanceSeries = useMemo(() => buildSharedPerformanceSeries(sharedProfiles, 8), [sharedProfiles]);

  const alerts = useMemo<AlertRow[]>(() => {
    const emptySkills = candidates.filter((candidate) => {
      const selections = candidate.profile?.skillSelections ?? [];
      return selections.length === 0 || selections.every((selection) => selection.selectedSubSkills.length === 0);
    }).length;

    const staleThreshold = new Date(daysAgoIso(14));
    const staleProfiles = candidates.filter((candidate) => {
      if (!candidate.updatedAt) return true;
      const updated = new Date(candidate.updatedAt);
      return Number.isNaN(updated.getTime()) || updated < staleThreshold;
    }).length;

    const missingContact = candidates.filter(
      (candidate) => !candidate.contact?.email?.trim() || !candidate.contact?.phoneNumber?.trim()
    ).length;

    return [
      { id: "empty-skills", label: "Candidates with empty skills", severity: "high", count: emptySkills },
      { id: "stale-profiles", label: "Stale profiles (14+ days)", severity: "medium", count: staleProfiles },
      { id: "missing-contact", label: "Missing contact info", severity: "high", count: missingContact }
    ];
  }, [candidates]);

  const roleGapRows = useMemo<RoleGapRow[]>(() => {
    const map = new Map<string, { demand: number; availableNow: number }>();
    for (const candidate of candidates) {
      const value = map.get(candidate.role) ?? { demand: 0, availableNow: 0 };
      value.demand += 1;
      if (candidate.available.toLowerCase() === "yes") {
        value.availableNow += 1;
      }
      map.set(candidate.role, value);
    }

    return [...map.entries()]
      .map(([role, value]) => ({
        id: role,
        role,
        demand: value.demand,
        availableNow: value.availableNow,
        gap: Math.max(0, value.demand - value.availableNow)
      }))
      .sort((a, b) => b.gap - a.gap);
  }, [candidates]);

  const skillGapRows = useMemo<SkillGapRow[]>(() => {
    const counter = new Map<string, number>();
    for (const candidate of candidates) {
      const selections = candidate.profile?.skillSelections ?? [];
      for (const selection of selections) {
        if (selection.selectedSubSkills.length === 0) {
          const category = skillsState.categories.find((item) => item.id === selection.categoryId);
          const label = category?.name ?? selection.categoryId;
          counter.set(label, (counter.get(label) ?? 0) + 1);
        }
      }
    }

    return [...counter.entries()]
      .map(([category, unfilledCount]) => ({ id: category, category, unfilledCount }))
      .sort((a, b) => b.unfilledCount - a.unfilledCount)
      .slice(0, 8);
  }, [candidates, skillsState.categories]);

  const activityRows = useMemo<ActivityRow[]>(() => {
    const candidateActivities: ActivityRow[] = candidates
      .map((candidate) => ({
        id: `candidate-${candidate.id}`,
        when: candidate.updatedAt ?? candidate.createdAt ?? "",
        event: `Candidate updated: ${candidate.name}`,
        actor: "Admin"
      }))
      .filter((item) => Boolean(item.when));

    const skillCategoryActivities: ActivityRow[] = skillsState.categories
      .map((category) => ({
        id: `category-${category.id}`,
        when: category.updatedAt ?? skillsState.updatedAt ?? "",
        event: `Skill category updated: ${category.name}`,
        actor: "Admin"
      }))
      .filter((item) => Boolean(item.when));

    const capabilityActivities: ActivityRow[] = skillsState.categories.flatMap((category) =>
      category.skills
        .map((skill) => ({
          id: `skill-${skill.id}`,
          when: skill.updatedAt ?? category.updatedAt ?? skillsState.updatedAt ?? "",
          event: `Capability set updated: ${category.name} / ${skill.name}`,
          actor: "Admin"
        }))
        .filter((item) => Boolean(item.when))
    );

    const sharedActivities: ActivityRow[] = sharedProfiles.flatMap((record) => {
      const rows: ActivityRow[] = [];
      if (record.sharedAt) {
        rows.push({
          id: `share-created-${record.id}`,
          when: record.sharedAt,
          event: `Profile shared: ${record.candidateName} -> ${record.sharedWithName}`,
          actor: "Admin"
        });
      }
      if (record.revokedAt) {
        rows.push({
          id: `share-revoked-${record.id}`,
          when: record.revokedAt,
          event: `Shared link revoked: ${record.candidateName}`,
          actor: "Admin"
        });
      }
      return rows;
    });

    return [...candidateActivities, ...skillCategoryActivities, ...capabilityActivities, ...sharedActivities]
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
      .slice(0, 12);
  }, [candidates, skillsState.categories, skillsState.updatedAt, sharedProfiles]);

  const completenessColumns = useMemo(
    () => [
      { key: "name", label: <SortHeaderLabel>Candidate</SortHeaderLabel>, render: (row: CandidateCompletenessRow) => row.name },
      { key: "role", label: <SortHeaderLabel>Role</SortHeaderLabel>, render: (row: CandidateCompletenessRow) => row.role },
      {
        key: "score",
        label: <SortHeaderLabel>Completeness</SortHeaderLabel>,
        widthClassName: "w-[160px]",
        render: (row: CandidateCompletenessRow) => `${row.score}%`
      }
    ],
    []
  );

  const roleGapColumns = useMemo(
    () => [
      { key: "role", label: <SortHeaderLabel>Role</SortHeaderLabel>, render: (row: RoleGapRow) => row.role },
      { key: "demand", label: <SortHeaderLabel>Demand</SortHeaderLabel>, widthClassName: "w-[90px]", render: (row: RoleGapRow) => row.demand },
      {
        key: "available",
        label: <SortHeaderLabel>Available</SortHeaderLabel>,
        widthClassName: "w-[110px]",
        render: (row: RoleGapRow) => row.availableNow
      },
      { key: "gap", label: <SortHeaderLabel>Gap</SortHeaderLabel>, widthClassName: "w-[80px]", render: (row: RoleGapRow) => row.gap }
    ],
    []
  );

  const skillGapColumns = useMemo(
    () => [
      { key: "category", label: <SortHeaderLabel>Skill Category</SortHeaderLabel>, render: (row: SkillGapRow) => row.category },
      {
        key: "count",
        label: <SortHeaderLabel>Unfilled</SortHeaderLabel>,
        widthClassName: "w-[110px]",
        render: (row: SkillGapRow) => row.unfilledCount
      }
    ],
    []
  );

  const activityColumns = useMemo(
    () => [
      {
        key: "when",
        label: <SortHeaderLabel>When</SortHeaderLabel>,
        widthClassName: "w-[180px]",
        render: (row: ActivityRow) => new Date(row.when).toLocaleString()
      },
      { key: "event", label: <SortHeaderLabel>Change</SortHeaderLabel>, render: (row: ActivityRow) => row.event },
      { key: "actor", label: <SortHeaderLabel>By</SortHeaderLabel>, widthClassName: "w-[100px]", render: (row: ActivityRow) => row.actor }
    ],
    []
  );

  return (
    <AdminShell>
      <div className="flex min-h-full flex-1 flex-col bg-white p-4 shadow-[0_10px_20px_rgba(148,163,184,0.2)]">
        <header className="sticky top-0 z-20 bg-white pb-4">
          <h1 className="text-[24px] font-semibold leading-8 text-[#0f172a]">Dashboard</h1>
          <p className="mt-1 text-sm text-[#64748b]">Operational analytics from candidates and skills data</p>
        </header>

        <main className="space-y-6">
          {candidatesResource.error ? (
            <QueryErrorBanner
              error="Failed to load candidates analytics. Please retry."
              onRetry={() => {
                void candidatesResource.refetch();
              }}
            />
          ) : null}
          {skillsResource.error ? (
            <QueryErrorBanner
              error="Failed to load skills analytics. Please retry."
              onRetry={() => {
                void skillsResource.refetch();
              }}
            />
          ) : null}
          {sharedProfilesResource.error ? (
            <QueryErrorBanner
              error="Failed to load shared profile analytics. Please retry."
              onRetry={() => {
                void sharedProfilesResource.refetch();
              }}
            />
          ) : null}
          {isInitialLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-28 animate-pulse rounded-lg border border-[#e2e8f0] bg-[#f8fafc]" />
                ))}
              </div>
              <TableSkeleton rows={6} />
            </div>
          ) : null}
          {!isInitialLoading && candidates.length === 0 ? (
            <EmptyState
              title="No dashboard data yet"
              message="Add candidates and skills to see analytics and operational insights."
            />
          ) : null}
          {!isInitialLoading && candidates.length > 0 ? (
            <>
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.03em] text-[#667085]">At a Glance</h2>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                  <article className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                    <button type="button" className="w-full text-left" onClick={() => navigate(APP_ROUTES.admin.candidates)}>
                      <p className="text-xs font-medium uppercase tracking-[0.02em] text-[#64748b]">Candidates</p>
                      <p className="mt-2 text-[28px] font-semibold leading-8 text-[#0f172a]">{totals.totalCandidates}</p>
                    </button>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <button
                        type="button"
                        className="rounded border border-[#e2e8f0] px-2 py-1 text-[#334155] hover:border-[#1595d4]"
                        onClick={() => navigate(withQuery(APP_ROUTES.admin.candidates, { status: "Active" }))}
                      >
                        Active {totals.activeCandidates}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-[#e2e8f0] px-2 py-1 text-[#334155] hover:border-[#1595d4]"
                        onClick={() => navigate(withQuery(APP_ROUTES.admin.candidates, { status: "Pending" }))}
                      >
                        Pending {totals.pendingCandidates}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-[#e2e8f0] px-2 py-1 text-[#334155] hover:border-[#1595d4]"
                        onClick={() => navigate(withQuery(APP_ROUTES.admin.candidates, { status: "Inactive" }))}
                      >
                        Inactive {totals.inactiveCandidates}
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-[#667085]">{formatDelta(weekly.newCandidatesDelta)}</p>
                  </article>

                  <article className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                    <button type="button" className="w-full text-left" onClick={() => navigate(APP_ROUTES.admin.skills)}>
                      <p className="text-xs font-medium uppercase tracking-[0.02em] text-[#64748b]">Skills Library</p>
                      <p className="mt-2 text-[28px] font-semibold leading-8 text-[#0f172a]">{totals.totalSkills}</p>
                    </button>
                    <div className="mt-3 space-y-1 text-xs text-[#475467]">
                      <p>{totals.totalCategories} categories</p>
                      <p>{totals.totalCapabilities} capabilities</p>
                    </div>
                  </article>

                  <article className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                    <button type="button" className="w-full text-left" onClick={() => navigate(APP_ROUTES.admin.sharedProfiles)}>
                      <p className="text-xs font-medium uppercase tracking-[0.02em] text-[#64748b]">Shared Profiles</p>
                      <p className="mt-2 text-[28px] font-semibold leading-8 text-[#0f172a]">{sharedOverview.total}</p>
                    </button>
                    <div className="mt-3 space-y-1 text-xs text-[#475467]">
                      <p>Active {sharedOverview.active}</p>
                      <p>Expiring soon {sharedOverview.expiringSoon}</p>
                      <p>Total opens {sharedOverview.opens}</p>
                    </div>
                  </article>

                  <article className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => navigate(withQuery(APP_ROUTES.admin.candidates, { progress: "completed" }))}
                    >
                      <p className="text-xs font-medium uppercase tracking-[0.02em] text-[#64748b]">Submission Progress</p>
                      <p className="mt-2 text-[28px] font-semibold leading-8 text-[#0f172a]">{completionRate}%</p>
                    </button>
                    <div className="mt-3 grid grid-cols-2 gap-1 text-xs text-[#475467]">
                      <p>Invited {lifecycle.invited}</p>
                      <p>Started {lifecycle.started}</p>
                      <p>In progress {lifecycle.inProgress}</p>
                      <p>Completed {lifecycle.completed}</p>
                    </div>
                    <p className="mt-3 text-xs text-[#667085]">{formatDelta(weekly.completedProfilesDelta)}</p>
                  </article>
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.03em] text-[#667085]">Week-over-Week</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {metricCard({
                    title: "New Candidates",
                    value: `${weekly.newCandidatesDelta >= 0 ? "+" : ""}${weekly.newCandidatesDelta}`,
                    subtitle: "Compared to previous 7 days"
                  })}
                  {metricCard({
                    title: "Completed Profiles",
                    value: `${weekly.completedProfilesDelta >= 0 ? "+" : ""}${weekly.completedProfilesDelta}`,
                    subtitle: "Compared to previous 7 days"
                  })}
                  {metricCard({
                    title: "Sharing Activity",
                    value: `${weekly.sharedProfilesDelta >= 0 ? "+" : ""}${weekly.sharedProfilesDelta} / ${
                      weekly.sharedOpensDelta >= 0 ? "+" : ""
                    }${weekly.sharedOpensDelta}`,
                    subtitle: "Shares / opens vs previous 7 days"
                  })}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <FunnelChart
                  stages={funnelStages}
                  onStageClick={(stage) => navigate(withQuery(APP_ROUTES.admin.candidates, { progress: stage }))}
                />
                <SharedPerformanceChart points={sharedPerformanceSeries} />
              </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <article className="rounded-lg border border-[#e2e8f0] bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold leading-6 text-[#0f172a]">Profile Completeness</h2>
                <p className="text-sm text-[#667085]">Average: {averageCompleteness}%</p>
              </div>
              <DataTable
                columns={completenessColumns}
                rows={completenessRows}
                rowKey={(row) => row.id}
                emptyMessage={candidatesResource.isLoading ? "Loading completeness..." : "No candidate data available."}
              />
            </article>

            <article className="rounded-lg border border-[#e2e8f0] bg-white p-4">
              <h2 className="mb-3 text-base font-semibold leading-6 text-[#0f172a]">Alerts</h2>
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between rounded-md border border-[#eaecf0] px-3 py-2">
                    <p className="text-sm text-[#344054]">{alert.label}</p>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-[2px] text-xs font-medium ${statusBadge(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className="text-sm font-semibold text-[#0f172a]">{alert.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <article className="rounded-lg border border-[#e2e8f0] bg-white p-4">
              <h2 className="mb-3 text-base font-semibold leading-6 text-[#0f172a]">Role Demand vs Availability</h2>
              <DataTable
                columns={roleGapColumns}
                rows={roleGapRows}
                rowKey={(row) => row.id}
                emptyMessage={candidatesResource.isLoading ? "Loading role gaps..." : "No role data available."}
              />
            </article>

            <article className="rounded-lg border border-[#e2e8f0] bg-white p-4">
              <h2 className="mb-3 text-base font-semibold leading-6 text-[#0f172a]">Top Skill Gaps</h2>
              <DataTable
                columns={skillGapColumns}
                rows={skillGapRows}
                rowKey={(row) => row.id}
                emptyMessage={skillsResource.isLoading ? "Loading skill gaps..." : "No skill gaps detected."}
              />
            </article>
          </section>

          <section className="rounded-lg border border-[#e2e8f0] bg-white p-4">
            <h2 className="mb-3 text-base font-semibold leading-6 text-[#0f172a]">Recent Activity (Who changed what)</h2>
            <DataTable
              columns={activityColumns}
              rows={activityRows}
              rowKey={(row) => row.id}
              emptyMessage="No recent changes yet."
            />
          </section>
            </>
          ) : null}
        </main>
      </div>
    </AdminShell>
  );
}
