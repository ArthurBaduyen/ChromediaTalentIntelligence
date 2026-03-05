import { Prisma } from "@prisma/client";
import { prisma } from "../prismaClient";
import type {
  CreateTestCaseInput,
  TestCaseFilters,
  TestCaseRecord,
  TestCaseType,
  UpdateTestCaseInput
} from "../types";

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : undefined;
}

function toJson(value: unknown) {
  if (value === null || value === undefined) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function mapTestCase(row: {
  id: string;
  featureId: string;
  title: string;
  preconditions: string | null;
  testData: unknown;
  steps: string[];
  expectedResults: string[];
  postConditions: string | null;
  priority: "P0" | "P1" | "P2";
  type: TestCaseType;
  isAutomatable: boolean;
  automationNotes: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}) : TestCaseRecord {
  return {
    id: row.id,
    featureId: row.featureId,
    title: row.title,
    preconditions: row.preconditions ?? "",
    testData: row.testData ?? null,
    steps: [...row.steps],
    expectedResults: [...row.expectedResults],
    postConditions: row.postConditions ?? "",
    priority: row.priority,
    type: row.type,
    isAutomatable: row.isAutomatable,
    automationNotes: row.automationNotes ?? "",
    tags: [...row.tags],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

function normalizeList(items: string[]) {
  return items.map((item) => item.trim()).filter(Boolean);
}

function whereForFilters(featureId: string, filters: TestCaseFilters) {
  const query = filters.search.trim().toLowerCase();
  const tags = query.length > 0 ? query.split(/\s+/).filter(Boolean) : [];

  return {
    featureId,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.isAutomatable !== undefined ? { isAutomatable: filters.isAutomatable } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            ...tags.map((tag) => ({ tags: { has: tag } }))
          ]
        }
      : {})
  };
}

export class TestCaseRepository {
  async listByFeature(featureId: string, filters?: Partial<TestCaseFilters>) {
    const resolved: TestCaseFilters = {
      type: filters?.type,
      priority: filters?.priority,
      isAutomatable: filters?.isAutomatable,
      search: filters?.search ?? ""
    };

    const rows = await prisma.testCase.findMany({
      where: whereForFilters(featureId, resolved),
      orderBy: [{ priority: "asc" }, { type: "asc" }, { updatedAt: "desc" }, { createdAt: "desc" }]
    });
    return rows.map(mapTestCase);
  }

  async findById(id: string) {
    const row = await prisma.testCase.findUnique({ where: { id } });
    return row ? mapTestCase(row) : null;
  }

  async create(input: CreateTestCaseInput) {
    const row = await prisma.testCase.create({
      data: {
        featureId: input.featureId,
        title: input.title.trim(),
        preconditions: input.preconditions.trim() || null,
        testData: toJson(input.testData),
        steps: normalizeList(input.steps),
        expectedResults: normalizeList(input.expectedResults),
        postConditions: input.postConditions.trim() || null,
        priority: input.priority,
        type: input.type,
        isAutomatable: input.isAutomatable,
        automationNotes: input.automationNotes.trim() || null,
        tags: normalizeList(input.tags)
      }
    });
    return mapTestCase(row);
  }

  async createMany(inputs: CreateTestCaseInput[]) {
    const created: TestCaseRecord[] = [];
    for (const input of inputs) {
      created.push(await this.create(input));
    }
    return created;
  }

  async update(id: string, input: UpdateTestCaseInput) {
    const row = await prisma.testCase.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.preconditions !== undefined ? { preconditions: input.preconditions.trim() || null } : {}),
        ...(input.testData !== undefined ? { testData: toJson(input.testData) } : {}),
        ...(input.steps !== undefined ? { steps: normalizeList(input.steps) } : {}),
        ...(input.expectedResults !== undefined ? { expectedResults: normalizeList(input.expectedResults) } : {}),
        ...(input.postConditions !== undefined ? { postConditions: input.postConditions.trim() || null } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.isAutomatable !== undefined ? { isAutomatable: input.isAutomatable } : {}),
        ...(input.automationNotes !== undefined ? { automationNotes: input.automationNotes.trim() || null } : {}),
        ...(input.tags !== undefined ? { tags: normalizeList(input.tags) } : {})
      }
    });
    return mapTestCase(row);
  }

  async delete(id: string) {
    await prisma.testCase.delete({ where: { id } });
    return { id, deleted: true };
  }
}
