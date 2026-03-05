import { AppRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { repositories } from "../db/repositories";
import { validateBody } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { generateBaselineTestCases } from "../services/testCaseGenerator";
import type {
  AuditLogRecord,
  CandidateRecord,
  SharedProfileRecord,
  SkillsState,
  TestCasePriority,
  TestCaseType
} from "../db/types";

const router = Router();

const candidateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    role: z.string().min(1),
    technologies: z.string().min(1),
    expectedSalary: z.string().min(1),
    available: z.string().min(1),
    status: z.enum(["Active", "Inactive", "Pending"]),
    contact: z
      .object({
        phoneCountryCode: z.literal("+63"),
        phoneNumber: z.string().min(1),
        email: z.string().email(),
        iMessage: z.string().optional()
      })
      .strict()
      .optional(),
    location: z
      .object({
        address: z.string(),
        city: z.string(),
        region: z.string(),
        zipCode: z.string(),
        country: z.string()
      })
      .strict()
      .optional(),
    compensation: z
      .object({
        expectedAmount: z.number().finite(),
        expectedRate: z.enum(["Hourly", "Daily", "Monthly"]),
        offeredAmount: z.number().finite().optional(),
        offeredRate: z.enum(["Hourly", "Daily", "Monthly"]).optional(),
        currency: z.literal("USD")
      })
      .strict()
      .optional(),
    employment: z
      .object({
        contract: z.string(),
        availability: z.string()
      })
      .strict()
      .optional(),
    profile: z
      .object({
        about: z.string(),
        experience: z.string(),
        education: z.array(z.object({ year: z.string(), degree: z.string(), school: z.string() }).strict()),
        projects: z.array(
          z
            .object({
              name: z.string(),
              role: z.string(),
              duration: z.string(),
              summary: z.string(),
              responsibilities: z.array(z.string()),
              technologies: z.array(z.string())
            })
            .strict()
        ),
        skillSelections: z
          .array(
            z
              .object({
                categoryId: z.string(),
                selectedSubSkills: z.array(
                  z
                    .object({
                      skillId: z.string(),
                      level: z.string(),
                      capabilityId: z.string(),
                      text: z.string().optional()
                    })
                    .strict()
                )
              })
              .strict()
          )
          .optional(),
        videoTitle: z.string().optional(),
        videoUrl: z.string().optional(),
        coderbyteScore: z.string().optional(),
        coderbyteLink: z.string().optional()
      })
      .strict()
      .optional(),
    schemaVersion: z.number().int().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
  })
  .strict();

const candidateUpdateSchema = candidateSchema.omit({ id: true });

const skillsSchema = z
  .object({
    taxonomyVersion: z.number().int().optional(),
    updatedAt: z.string().optional(),
    categories: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          slug: z.string().optional(),
          description: z.string().optional(),
          skills: z.array(
            z
              .object({
                id: z.string(),
                name: z.string(),
                code: z.string().optional(),
                description: z.string().optional(),
                capabilities: z.array(
                  z
                    .object({
                      level: z.string(),
                      entries: z.array(z.string())
                    })
                    .strict()
                ),
                createdAt: z.string().optional(),
                updatedAt: z.string().optional()
              })
              .strict()
          ),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
        .strict()
    )
  })
  .strict();

const sharedProfileSchema = z
  .object({
    id: z.string().min(1),
    shareToken: z.string().optional(),
    candidateId: z.string().min(1),
    candidateName: z.string().min(1),
    candidateRole: z.string().min(1),
    sharedWithName: z.string().min(1),
    sharedWithEmail: z.string().email(),
    rateLabel: z.string(),
    expirationDate: z.string().min(1),
    sharedAt: z.string().min(1),
    revokedAt: z.string().optional(),
    accessCount: z.number().int().optional(),
    lastAccessedAt: z.string().optional()
  })
  .strict();

const sharedProfileUpdateSchema = sharedProfileSchema.omit({ id: true });

const candidateInviteCreateSchema = z
  .object({
    candidateId: z.string().min(1),
    expirationDate: z.string().optional()
  })
  .strict();

const testCasePrioritySchema = z.enum(["P0", "P1", "P2"]);
const testCaseTypeSchema = z.enum(["Smoke", "Functional", "Negative", "Regression", "API", "Integration", "UI", "Security", "Performance"]);

const testCaseCreateSchema = z
  .object({
    title: z.string().min(1),
    preconditions: z.string().optional().default(""),
    testData: z.unknown().optional(),
    steps: z.array(z.string().min(1)).min(1),
    expectedResults: z.array(z.string().min(1)).min(1),
    postConditions: z.string().optional().default(""),
    priority: testCasePrioritySchema,
    type: testCaseTypeSchema,
    isAutomatable: z.boolean(),
    automationNotes: z.string().optional().default(""),
    tags: z.array(z.string()).optional().default([])
  })
  .strict();

const testCaseUpdateSchema = testCaseCreateSchema.partial();

const testRunStatusSchema = z.enum(["InProgress", "Completed"]);
const testExecutionStatusSchema = z.enum(["NotRun", "Pass", "Fail", "Blocked"]);

const testRunCreateSchema = z
  .object({
    name: z.string().min(1),
    tester: z.string().optional().default(""),
    notes: z.string().optional().default("")
  })
  .strict();

const testRunUpdateSchema = z
  .object({
    name: z.string().optional(),
    tester: z.string().optional(),
    notes: z.string().optional(),
    status: testRunStatusSchema.optional(),
    completedAt: z.string().optional()
  })
  .strict();

const testRunResultUpsertSchema = z
  .object({
    status: testExecutionStatusSchema,
    testedBy: z.string().optional().default(""),
    notes: z.string().optional().default(""),
    defectLink: z.string().optional().default(""),
    executedAt: z.string().optional()
  })
  .strict();

const featureCreateSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional().default(""),
    rolesInvolved: z.array(z.string()).optional().default([]),
    platforms: z.array(z.string()).optional().default([]),
    browsersOrDevices: z.array(z.string()).optional().default([]),
    hasApi: z.boolean().optional().default(false)
  })
  .strict();

const testCaseGenerateSchema = z
  .object({
    featureName: z.string().optional(),
    description: z.string().optional(),
    userRolesInvolved: z.array(z.string()).optional(),
    platforms: z.array(z.string()).optional(),
    browsersOrDevices: z.array(z.string()).optional(),
    hasApi: z.boolean().optional(),
    disableBundles: z
      .array(z.enum(["smoke", "functional", "negative", "permissions", "api", "integration", "compatibility", "performance", "security", "regression"]))
      .optional(),
    selectedBundles: z
      .array(z.enum(["smoke", "functional", "negative", "permissions", "api", "integration", "compatibility", "performance", "security", "regression"]))
      .optional(),
    persist: z.boolean().optional().default(false)
  })
  .strict();

function paramValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

function parsePagination(query: Record<string, unknown>) {
  const rawPage = Number(String(query.page ?? "1"));
  const rawPageSize = Number(String(query.pageSize ?? "12"));
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.min(100, Math.floor(rawPageSize)) : 12;
  return { page, pageSize };
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return undefined;
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages
  };
}

function compareValues(a: string | number, b: string | number, dir: "asc" | "desc") {
  if (typeof a === "number" && typeof b === "number") {
    return dir === "asc" ? a - b : b - a;
  }
  const x = String(a).toLowerCase();
  const y = String(b).toLowerCase();
  if (x < y) return dir === "asc" ? -1 : 1;
  if (x > y) return dir === "asc" ? 1 : -1;
  return 0;
}

function getSubmissionProgress(candidate: CandidateRecord): "invited" | "started" | "in-progress" | "completed" {
  const selections = candidate.profile?.skillSelections ?? [];
  if (selections.length === 0) return "invited";
  const filledGroups = selections.filter((selection) => selection.selectedSubSkills.length > 0).length;
  if (filledGroups === 0) return "invited";
  if (filledGroups === selections.length) return "completed";
  if (filledGroups === 1) return "started";
  return "in-progress";
}

function candidateExpectedSalaryValue(candidate: CandidateRecord) {
  if (typeof candidate.compensation?.expectedAmount === "number" && Number.isFinite(candidate.compensation.expectedAmount)) {
    return candidate.compensation.expectedAmount;
  }
  const parsed = Number(String(candidate.expectedSalary ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function shareStatus(record: SharedProfileRecord): "Active" | "Expired" | "Revoked" {
  if (record.revokedAt) return "Revoked";
  const expiration = new Date(record.expirationDate);
  if (Number.isNaN(expiration.getTime())) return "Expired";
  const now = new Date();
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startExp = new Date(expiration.getFullYear(), expiration.getMonth(), expiration.getDate()).getTime();
  return startExp < startNow ? "Expired" : "Active";
}

async function appendAuditLog(record: Omit<AuditLogRecord, "id" | "createdAt">) {
  await repositories.auditLogs.append(record);
}

function authActorRole(role: AppRole): AuditLogRecord["actorRole"] {
  if (role === AppRole.candidate) return "candidate";
  if (role === AppRole.client) return "client";
  return "admin";
}

router.post(
  "/candidate-links",
  requireAuth,
  requireRole(AppRole.super_admin, AppRole.admin),
  validateBody(candidateInviteCreateSchema),
  async (req, res) => {
    const payload = req.body as z.infer<typeof candidateInviteCreateSchema>;
    try {
      const invite = await repositories.candidateInviteLinks.create(payload.candidateId, payload.expirationDate);
      res.status(201).json({
        candidateId: invite.candidateId,
        token: invite.token,
        expiresAt: invite.expiresAt
      });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create candidate link" });
    }
  }
);

router.get("/features", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), async (_req, res) => {
  res.json(await repositories.features.list());
});

router.post(
  "/features",
  requireAuth,
  requireRole(AppRole.super_admin, AppRole.admin),
  validateBody(featureCreateSchema),
  async (req, res) => {
    const payload = req.body as z.infer<typeof featureCreateSchema>;
    const feature = await repositories.features.create(payload);
    res.status(201).json(feature);
  }
);

router.get("/features/:id/test-cases", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), async (req, res) => {
  const featureId = paramValue(req.params.id);
  const feature = await repositories.features.findById(featureId);
  if (!feature) {
    res.status(404).json({ message: "Feature not found" });
    return;
  }

  const rawType = String(req.query.type ?? "").trim();
  const rawPriority = String(req.query.priority ?? "").trim();
  const type = testCaseTypeSchema.options.includes(rawType as TestCaseType) ? (rawType as TestCaseType) : undefined;
  const priority = testCasePrioritySchema.options.includes(rawPriority as TestCasePriority)
    ? (rawPriority as TestCasePriority)
    : undefined;
  const isAutomatable = parseBoolean(req.query.isAutomatable);
  const search = String(req.query.q ?? "").trim();

  const rows = await repositories.testCases.listByFeature(featureId, { type, priority, isAutomatable, search });
  res.json(rows);
});

router.post(
  "/features/:id/test-cases",
  requireAuth,
  requireRole(AppRole.super_admin, AppRole.admin),
  validateBody(testCaseCreateSchema),
  async (req, res) => {
    const featureId = paramValue(req.params.id);
    const feature = await repositories.features.findById(featureId);
    if (!feature) {
      res.status(404).json({ message: "Feature not found" });
      return;
    }
    const payload = req.body as z.infer<typeof testCaseCreateSchema>;
    const created = await repositories.testCases.create({
      featureId,
      title: payload.title,
      preconditions: payload.preconditions,
      testData: payload.testData,
      steps: payload.steps,
      expectedResults: payload.expectedResults,
      postConditions: payload.postConditions,
      priority: payload.priority,
      type: payload.type,
      isAutomatable: payload.isAutomatable,
      automationNotes: payload.automationNotes,
      tags: payload.tags
    });
    res.status(201).json(created);
  }
);

router.put(
  "/test-cases/:id",
  requireAuth,
  requireRole(AppRole.super_admin, AppRole.admin),
  validateBody(testCaseUpdateSchema),
  async (req, res) => {
    const id = paramValue(req.params.id);
    const existing = await repositories.testCases.findById(id);
    if (!existing) {
      res.status(404).json({ message: "Test case not found" });
      return;
    }
    const payload = req.body as z.infer<typeof testCaseUpdateSchema>;
    const updated = await repositories.testCases.update(id, payload);
    res.json(updated);
  }
);

router.delete("/test-cases/:id", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), async (req, res) => {
  const id = paramValue(req.params.id);
  const existing = await repositories.testCases.findById(id);
  if (!existing) {
    res.status(404).json({ message: "Test case not found" });
    return;
  }
  res.json(await repositories.testCases.delete(id));
});

router.get("/features/:id/test-runs", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), async (req, res) => {
  const featureId = paramValue(req.params.id);
  const feature = await repositories.features.findById(featureId);
  if (!feature) {
    res.status(404).json({ message: "Feature not found" });
    return;
  }
  res.json(await repositories.testRuns.listByFeature(featureId));
});

router.post(
  "/features/:id/test-runs",
  requireAuth,
  requireRole(AppRole.super_admin, AppRole.admin),
  validateBody(testRunCreateSchema),
  async (req, res) => {
    const featureId = paramValue(req.params.id);
    const feature = await repositories.features.findById(featureId);
    if (!feature) {
      res.status(404).json({ message: "Feature not found" });
      return;
    }
    const payload = req.body as z.infer<typeof testRunCreateSchema>;
    const created = await repositories.testRuns.create({ featureId, ...payload });
    res.status(201).json(created);
  }
);

router.put(
  "/test-runs/:id",
  requireAuth,
  requireRole(AppRole.super_admin, AppRole.admin),
  validateBody(testRunUpdateSchema),
  async (req, res) => {
    const runId = paramValue(req.params.id);
    const payload = req.body as z.infer<typeof testRunUpdateSchema>;
    const updated = await repositories.testRuns.update(runId, payload);
    if (!updated) {
      res.status(404).json({ message: "Test run not found" });
      return;
    }
    res.json(updated);
  }
);

router.get("/test-runs/:id/results", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), async (req, res) => {
  const runId = paramValue(req.params.id);
  const run = await repositories.testRuns.findRunById(runId);
  if (!run) {
    res.status(404).json({ message: "Test run not found" });
    return;
  }
  res.json(await repositories.testRuns.listResults(runId));
});

router.put(
  "/test-runs/:id/results/:testCaseId",
  requireAuth,
  requireRole(AppRole.super_admin, AppRole.admin),
  validateBody(testRunResultUpsertSchema),
  async (req, res) => {
    const runId = paramValue(req.params.id);
    const testCaseId = paramValue(req.params.testCaseId);
    const run = await repositories.testRuns.findRunById(runId);
    if (!run) {
      res.status(404).json({ message: "Test run not found" });
      return;
    }
    const testCase = await repositories.testCases.findById(testCaseId);
    if (!testCase || testCase.featureId !== run.featureId) {
      res.status(404).json({ message: "Test case not found for this run" });
      return;
    }

    const payload = req.body as z.infer<typeof testRunResultUpsertSchema>;
    const result = await repositories.testRuns.upsertResult(runId, testCaseId, {
      runId,
      testCaseId,
      status: payload.status,
      testedBy: payload.testedBy,
      notes: payload.notes,
      defectLink: payload.defectLink,
      executedAt: payload.executedAt ?? new Date().toISOString()
    });
    res.json(result);
  }
);

async function handleGenerateTestCases(
  featureId: string,
  body: z.infer<typeof testCaseGenerateSchema>,
  res: import("express").Response
) {
  const feature = await repositories.features.findById(featureId);
  if (!feature) {
    res.status(404).json({ message: "Feature not found" });
    return;
  }

  const generated = generateBaselineTestCases({
    featureId: feature.id,
    featureName: body.featureName?.trim() || feature.name,
    description: body.description?.trim() || feature.description,
    roles: body.userRolesInvolved ?? feature.rolesInvolved,
    platforms: body.platforms ?? feature.platforms,
    browsersOrDevices: body.browsersOrDevices ?? feature.browsersOrDevices,
    hasApi: body.hasApi ?? feature.hasApi,
    disabledBundles: body.disableBundles,
    selectedBundles: body.selectedBundles
  });

  if (!body.persist) {
    res.json({ featureId: feature.id, generated });
    return;
  }

  const saved = await repositories.testCases.createMany(generated);
  res.status(201).json({ featureId: feature.id, generated: saved });
}

router.post(
  "/features/:id/test-cases/generate",
  requireAuth,
  requireRole(AppRole.super_admin, AppRole.admin),
  validateBody(testCaseGenerateSchema),
  async (req, res) => {
    await handleGenerateTestCases(paramValue(req.params.id), req.body as z.infer<typeof testCaseGenerateSchema>, res);
  }
);

router.post(
  /^\/features\/([^/]+)\/test-cases:generate$/,
  requireAuth,
  requireRole(AppRole.super_admin, AppRole.admin),
  validateBody(testCaseGenerateSchema),
  async (req, res) => {
    const featureId = paramValue((req.params as Record<string, unknown>)[0]);
    await handleGenerateTestCases(featureId, req.body as z.infer<typeof testCaseGenerateSchema>, res);
  }
);

router.get("/candidates/query", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), async (req, res) => {
  const records = await repositories.candidates.list();
  const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const status = String(req.query.status ?? "").trim();
  const availability = String(req.query.availability ?? "").trim();
  const role = String(req.query.role ?? "").trim();
  const progress = String(req.query.progress ?? "").trim();
  const sortBy = String(req.query.sortBy ?? "name").trim();
  const sortDir = req.query.sortDir === "desc" ? "desc" : "asc";

  const filtered = records.filter((candidate) => {
    const matchesQ =
      !q ||
      candidate.name.toLowerCase().includes(q) ||
      candidate.role.toLowerCase().includes(q) ||
      candidate.technologies.toLowerCase().includes(q);
    const matchesStatus = !status || status === "all" || candidate.status === status;
    const candidateAvailability = candidate.available.toLowerCase() === "yes" ? "yes" : "later";
    const matchesAvailability = !availability || availability === "all" || candidateAvailability === availability;
    const matchesRole = !role || role === "all" || candidate.role === role;
    const matchesProgress = !progress || progress === "all" || getSubmissionProgress(candidate) === progress;
    return matchesQ && matchesStatus && matchesAvailability && matchesRole && matchesProgress;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "role") return compareValues(a.role, b.role, sortDir);
    if (sortBy === "technologies") return compareValues(a.technologies, b.technologies, sortDir);
    if (sortBy === "expectedSalary") return compareValues(candidateExpectedSalaryValue(a), candidateExpectedSalaryValue(b), sortDir);
    if (sortBy === "status") return compareValues(a.status, b.status, sortDir);
    if (sortBy === "available") return compareValues(a.available, b.available, sortDir);
    if (sortBy === "updatedAt") return compareValues(a.updatedAt ?? "", b.updatedAt ?? "", sortDir);
    return compareValues(a.name, b.name, sortDir);
  });

  res.json(paginate(sorted, page, pageSize));
});

router.get("/candidates", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), async (_req, res) => {
  res.json(await repositories.candidates.list());
});

router.get("/candidates/:id", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), async (req, res) => {
  const record = await repositories.candidates.findByLegacyId(paramValue(req.params.id));
  if (!record) {
    res.status(404).json({ message: "Candidate not found" });
    return;
  }
  res.json(record);
});

router.post("/candidates", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), validateBody(candidateSchema), async (req, res) => {
  const candidate = await repositories.candidates.upsert(req.body as CandidateRecord);
  await appendAuditLog({
    action: "candidate.create",
    entityType: "candidate",
    entityId: candidate.id,
    actorRole: authActorRole(req.auth!.role),
    actorEmail: req.auth!.email,
    beforeState: null,
    afterState: candidate
  });
  res.status(201).json(candidate);
});

router.put("/candidates/:id", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), validateBody(candidateUpdateSchema), async (req, res) => {
  const previous = await repositories.candidates.findByLegacyId(paramValue(req.params.id));
  const candidate = await repositories.candidates.upsert({
    ...(req.body as Omit<CandidateRecord, "id">),
    id: paramValue(req.params.id)
  });
  await appendAuditLog({
    action: "candidate.update",
    entityType: "candidate",
    entityId: paramValue(req.params.id),
    actorRole: authActorRole(req.auth!.role),
    actorEmail: req.auth!.email,
    beforeState: previous,
    afterState: candidate
  });
  res.json(candidate);
});

router.delete("/candidates/:id", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), async (req, res) => {
  const previous = await repositories.candidates.findByLegacyId(paramValue(req.params.id));
  await repositories.candidates.softDelete(paramValue(req.params.id));
  await appendAuditLog({
    action: "candidate.delete",
    entityType: "candidate",
    entityId: paramValue(req.params.id),
    actorRole: authActorRole(req.auth!.role),
    actorEmail: req.auth!.email,
    beforeState: previous,
    afterState: null
  });
  res.json({ id: paramValue(req.params.id), deleted: true });
});

router.get("/skills/query", requireAuth, async (req, res) => {
  const state = await repositories.skills.getState();
  const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
  const scope = String(req.query.scope ?? "categories").trim();
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const sortBy = String(req.query.sortBy ?? "name").trim();
  const sortDir = req.query.sortDir === "desc" ? "desc" : "asc";

  if (scope === "categories") {
    const rows = state.categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        skillsCount: category.skills.length,
        updatedAt: category.updatedAt ?? ""
      }))
      .filter((row) => !q || row.name.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sortBy === "skillsCount") return compareValues(a.skillsCount, b.skillsCount, sortDir);
        if (sortBy === "updatedAt") return compareValues(a.updatedAt, b.updatedAt, sortDir);
        return compareValues(a.name, b.name, sortDir);
      });

    res.json(paginate(rows, page, pageSize));
    return;
  }

  if (scope === "skills") {
    const categoryId = String(req.query.categoryId ?? "").trim();
    const category = state.categories.find((item) => item.id === categoryId);
    if (!category) {
      res.json(paginate([], page, pageSize));
      return;
    }

    const rows = category.skills
      .map((skill) => ({
        id: skill.id,
        categoryId,
        name: skill.name,
        capabilityCount: skill.capabilities.reduce((sum, group) => sum + group.entries.length, 0),
        updatedAt: skill.updatedAt ?? ""
      }))
      .filter((row) => !q || row.name.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sortBy === "capabilityCount") return compareValues(a.capabilityCount, b.capabilityCount, sortDir);
        if (sortBy === "updatedAt") return compareValues(a.updatedAt, b.updatedAt, sortDir);
        return compareValues(a.name, b.name, sortDir);
      });

    res.json(paginate(rows, page, pageSize));
    return;
  }

  res.status(400).json({ message: "Invalid scope" });
});

router.get("/skills", requireAuth, async (_req, res) => {
  res.json(await repositories.skills.getState());
});

router.put("/skills", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), validateBody(skillsSchema), async (req, res) => {
  const previous = await repositories.skills.getState();
  const updated = await repositories.skills.replaceState(req.body as SkillsState);
  await appendAuditLog({
    action: "skills.update",
    entityType: "skills",
    entityId: "taxonomy",
    actorRole: authActorRole(req.auth!.role),
    actorEmail: req.auth!.email,
    beforeState: previous,
    afterState: updated
  });
  res.json(updated);
});

router.get("/shared-profiles/query", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), async (req, res) => {
  const records = await repositories.sharedProfiles.list();
  const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const status = String(req.query.status ?? "").trim();
  const sortBy = String(req.query.sortBy ?? "sharedAt").trim();
  const sortDir = req.query.sortDir === "asc" ? "asc" : "desc";

  const filtered = records.filter((row) => {
    const rowStatus = shareStatus(row);
    const matchesStatus = !status || status === "all" || rowStatus.toLowerCase() === status.toLowerCase();
    const matchesQ =
      !q ||
      row.candidateName.toLowerCase().includes(q) ||
      row.candidateRole.toLowerCase().includes(q) ||
      row.sharedWithName.toLowerCase().includes(q) ||
      row.sharedWithEmail.toLowerCase().includes(q);
    return matchesStatus && matchesQ;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "candidateName") return compareValues(a.candidateName, b.candidateName, sortDir);
    if (sortBy === "sharedWithName") return compareValues(a.sharedWithName, b.sharedWithName, sortDir);
    if (sortBy === "rateLabel") return compareValues(a.rateLabel, b.rateLabel, sortDir);
    if (sortBy === "expirationDate") return compareValues(a.expirationDate, b.expirationDate, sortDir);
    if (sortBy === "status") return compareValues(shareStatus(a), shareStatus(b), sortDir);
    if (sortBy === "accessCount") return compareValues(a.accessCount ?? 0, b.accessCount ?? 0, sortDir);
    return compareValues(a.sharedAt, b.sharedAt, sortDir);
  });

  res.json(paginate(sorted, page, pageSize));
});

router.get("/shared-profiles", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), async (_req, res) => {
  res.json(await repositories.sharedProfiles.list());
});

router.post("/shared-profiles", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), validateBody(sharedProfileSchema), async (req, res) => {
  const saved = await repositories.sharedProfiles.upsert(req.body as SharedProfileRecord);
  await appendAuditLog({
    action: "shared_profile.create",
    entityType: "shared_profile",
    entityId: saved.id,
    actorRole: authActorRole(req.auth!.role),
    actorEmail: req.auth!.email,
    beforeState: null,
    afterState: saved
  });
  res.status(201).json(saved);
});

router.post("/shared-profiles/:id/revoke", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), async (req, res) => {
  const previous = await repositories.sharedProfiles.findByLegacyId(paramValue(req.params.id));
  if (!previous) {
    res.status(404).json({ message: "Shared profile not found" });
    return;
  }
  const revoked = await repositories.sharedProfiles.revoke(paramValue(req.params.id));
  await appendAuditLog({
    action: "shared_profile.revoke",
    entityType: "shared_profile",
    entityId: paramValue(req.params.id),
    actorRole: authActorRole(req.auth!.role),
    actorEmail: req.auth!.email,
    beforeState: previous,
    afterState: revoked
  });
  res.json(revoked);
});

router.put("/shared-profiles/:id", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), validateBody(sharedProfileUpdateSchema), async (req, res) => {
  const previous = await repositories.sharedProfiles.findByLegacyId(paramValue(req.params.id));
  const updated = await repositories.sharedProfiles.upsert({
    ...(req.body as Omit<SharedProfileRecord, "id">),
    id: paramValue(req.params.id)
  });
  await appendAuditLog({
    action: "shared_profile.update",
    entityType: "shared_profile",
    entityId: paramValue(req.params.id),
    actorRole: authActorRole(req.auth!.role),
    actorEmail: req.auth!.email,
    beforeState: previous,
    afterState: updated
  });
  res.json(updated);
});

router.delete("/shared-profiles/:id", requireAuth, requireRole(AppRole.super_admin, AppRole.admin), async (req, res) => {
  const previous = await repositories.sharedProfiles.findByLegacyId(paramValue(req.params.id));
  await repositories.sharedProfiles.softDelete(paramValue(req.params.id));
  await appendAuditLog({
    action: "shared_profile.delete",
    entityType: "shared_profile",
    entityId: paramValue(req.params.id),
    actorRole: authActorRole(req.auth!.role),
    actorEmail: req.auth!.email,
    beforeState: previous,
    afterState: null
  });
  res.json({ id: paramValue(req.params.id), deleted: true });
});

router.get("/audit-logs/query", requireAuth, requireRole(AppRole.super_admin), async (req, res) => {
  const logs = await repositories.auditLogs.list();
  const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const action = String(req.query.action ?? "").trim();
  const entity = String(req.query.entity ?? "").trim();
  const sortBy = String(req.query.sortBy ?? "createdAt").trim();
  const sortDir = req.query.sortDir === "asc" ? "asc" : "desc";

  const filtered = logs.filter((log) => {
    const matchesAction = !action || action === "all" || log.action === action;
    const matchesEntity = !entity || entity === "all" || log.entityType === entity;
    const matchesQ =
      !q ||
      log.action.toLowerCase().includes(q) ||
      log.entityId.toLowerCase().includes(q) ||
      log.actorEmail.toLowerCase().includes(q);
    return matchesAction && matchesEntity && matchesQ;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "action") return compareValues(a.action, b.action, sortDir);
    if (sortBy === "entityType") return compareValues(a.entityType, b.entityType, sortDir);
    if (sortBy === "entityId") return compareValues(a.entityId, b.entityId, sortDir);
    if (sortBy === "actorEmail") return compareValues(a.actorEmail, b.actorEmail, sortDir);
    return compareValues(a.createdAt, b.createdAt, sortDir);
  });

  res.json(paginate(sorted, page, pageSize));
});

router.get("/audit-logs", requireAuth, requireRole(AppRole.super_admin), async (_req, res) => {
  res.json(await repositories.auditLogs.list());
});

export default router;
