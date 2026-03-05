import { prisma } from "../prismaClient";
import type {
  CreateTestRunInput,
  TestExecutionStatus,
  TestRunRecord,
  TestRunResultRecord,
  TestRunSummary,
  TestRunStatus,
  UpdateTestRunInput,
  UpsertTestRunResultInput
} from "../types";

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : undefined;
}

function emptySummary(total = 0): TestRunSummary {
  return { total, pass: 0, fail: 0, blocked: 0, notRun: total };
}

function summarize(totalCases: number, statuses: TestExecutionStatus[]) {
  const summary = emptySummary(totalCases);
  for (const status of statuses) {
    if (status === "Pass") summary.pass += 1;
    if (status === "Fail") summary.fail += 1;
    if (status === "Blocked") summary.blocked += 1;
    if (status === "NotRun") summary.notRun += 1;
  }
  const executed = summary.pass + summary.fail + summary.blocked + summary.notRun;
  if (executed < totalCases) {
    summary.notRun += totalCases - executed;
  }
  return summary;
}

function mapResult(row: {
  id: string;
  runId: string;
  testCaseId: string;
  status: TestExecutionStatus;
  testedBy: string | null;
  notes: string | null;
  defectLink: string | null;
  executedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): TestRunResultRecord {
  return {
    id: row.id,
    runId: row.runId,
    testCaseId: row.testCaseId,
    status: row.status,
    testedBy: row.testedBy ?? "",
    notes: row.notes ?? "",
    defectLink: row.defectLink ?? "",
    executedAt: toIso(row.executedAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

function mapRun(
  row: {
    id: string;
    featureId: string;
    name: string;
    tester: string | null;
    notes: string | null;
    status: TestRunStatus;
    startedAt: Date;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  summary: TestRunSummary
): TestRunRecord {
  return {
    id: row.id,
    featureId: row.featureId,
    name: row.name,
    tester: row.tester ?? "",
    notes: row.notes ?? "",
    status: row.status,
    startedAt: toIso(row.startedAt),
    completedAt: toIso(row.completedAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    summary
  };
}

export class TestRunRepository {
  async listByFeature(featureId: string) {
    const [runs, totalCases] = await Promise.all([
      prisma.testRun.findMany({ where: { featureId }, orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }] }),
      prisma.testCase.count({ where: { featureId } })
    ]);

    if (runs.length === 0) return [];

    const statuses = await prisma.testRunResult.findMany({
      where: { runId: { in: runs.map((run) => run.id) } },
      select: { runId: true, status: true }
    });

    const statusMap = new Map<string, TestExecutionStatus[]>();
    for (const item of statuses) {
      const current = statusMap.get(item.runId) ?? [];
      current.push(item.status);
      statusMap.set(item.runId, current);
    }

    return runs.map((run) => mapRun(run, summarize(totalCases, statusMap.get(run.id) ?? [])));
  }

  async findRunById(id: string) {
    return prisma.testRun.findUnique({ where: { id } });
  }

  async create(input: CreateTestRunInput) {
    const totalCases = await prisma.testCase.count({ where: { featureId: input.featureId } });
    const row = await prisma.testRun.create({
      data: {
        featureId: input.featureId,
        name: input.name.trim(),
        tester: input.tester?.trim() || null,
        notes: input.notes?.trim() || null,
        status: "InProgress"
      }
    });
    return mapRun(row, emptySummary(totalCases));
  }

  async update(id: string, input: UpdateTestRunInput) {
    const run = await prisma.testRun.findUnique({ where: { id } });
    if (!run) return null;

    const row = await prisma.testRun.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.tester !== undefined ? { tester: input.tester.trim() || null } : {}),
        ...(input.notes !== undefined ? { notes: input.notes.trim() || null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.completedAt !== undefined ? { completedAt: input.completedAt ? new Date(input.completedAt) : null } : {})
      }
    });

    const [totalCases, statuses] = await Promise.all([
      prisma.testCase.count({ where: { featureId: row.featureId } }),
      prisma.testRunResult.findMany({ where: { runId: row.id }, select: { status: true } })
    ]);

    return mapRun(
      row,
      summarize(
        totalCases,
        statuses.map((item) => item.status)
      )
    );
  }

  async listResults(runId: string) {
    const rows = await prisma.testRunResult.findMany({ where: { runId }, orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }] });
    return rows.map(mapResult);
  }

  async upsertResult(runId: string, testCaseId: string, input: UpsertTestRunResultInput) {
    const row = await prisma.testRunResult.upsert({
      where: { runId_testCaseId: { runId, testCaseId } },
      create: {
        runId,
        testCaseId,
        status: input.status,
        testedBy: input.testedBy.trim() || null,
        notes: input.notes.trim() || null,
        defectLink: input.defectLink.trim() || null,
        executedAt: input.executedAt ? new Date(input.executedAt) : new Date()
      },
      update: {
        status: input.status,
        testedBy: input.testedBy.trim() || null,
        notes: input.notes.trim() || null,
        defectLink: input.defectLink.trim() || null,
        executedAt: input.executedAt ? new Date(input.executedAt) : new Date()
      }
    });

    return mapResult(row);
  }
}
