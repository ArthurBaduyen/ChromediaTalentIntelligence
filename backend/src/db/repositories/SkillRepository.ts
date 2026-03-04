import { Prisma } from "@prisma/client";
import { prisma } from "../prismaClient";
import type { SkillsState } from "../types";

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : undefined;
}

function asCapabilities(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) return [];
  return value as Array<{ level: string; entries: string[] }>;
}

export class SkillRepository {
  async getState(): Promise<SkillsState> {
    const [taxonomy, categories] = await Promise.all([
      prisma.skillTaxonomy.findUnique({ where: { id: 1 } }),
      prisma.skillCategory.findMany({
        where: { deletedAt: null },
        include: {
          skills: {
            where: { deletedAt: null },
            orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }]
          }
        },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }]
      })
    ]);

    return {
      taxonomyVersion: taxonomy?.taxonomyVersion ?? undefined,
      updatedAt: toIso(taxonomy?.updatedAt),
      categories: categories.map((category) => ({
        id: category.legacyId,
        name: category.name,
        slug: category.slug ?? undefined,
        description: category.description ?? undefined,
        createdAt: toIso(category.createdAt),
        updatedAt: toIso(category.updatedAt),
        skills: category.skills.map((skill) => ({
          id: skill.legacyId,
          name: skill.name,
          code: skill.code ?? undefined,
          description: skill.description ?? undefined,
          capabilities: asCapabilities(skill.capabilities),
          createdAt: toIso(skill.createdAt),
          updatedAt: toIso(skill.updatedAt)
        }))
      }))
    };
  }

  async replaceState(state: SkillsState): Promise<SkillsState> {
    await prisma.$transaction(async (tx) => {
      await tx.skillTaxonomy.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          taxonomyVersion: state.taxonomyVersion ?? null,
          updatedAt: state.updatedAt ? new Date(state.updatedAt) : new Date()
        },
        update: {
          taxonomyVersion: state.taxonomyVersion ?? null,
          updatedAt: state.updatedAt ? new Date(state.updatedAt) : new Date()
        }
      });

      await tx.skill.updateMany({ data: { deletedAt: new Date() } });
      await tx.skillCategory.updateMany({ data: { deletedAt: new Date() } });

      for (let categoryIndex = 0; categoryIndex < state.categories.length; categoryIndex += 1) {
        const category = state.categories[categoryIndex];
        const categoryCreatedAt = category.createdAt ? new Date(category.createdAt) : new Date();
        const categoryUpdatedAt = category.updatedAt ? new Date(category.updatedAt) : new Date();

        const upsertedCategory = await tx.skillCategory.upsert({
          where: { legacyId: category.id },
          create: {
            legacyId: category.id,
            name: category.name,
            slug: category.slug ?? null,
            description: category.description ?? null,
            displayOrder: categoryIndex,
            createdAt: categoryCreatedAt,
            updatedAt: categoryUpdatedAt,
            deletedAt: null
          },
          update: {
            name: category.name,
            slug: category.slug ?? null,
            description: category.description ?? null,
            displayOrder: categoryIndex,
            updatedAt: categoryUpdatedAt,
            deletedAt: null
          }
        });

        for (let skillIndex = 0; skillIndex < category.skills.length; skillIndex += 1) {
          const skill = category.skills[skillIndex];
          const skillCreatedAt = skill.createdAt ? new Date(skill.createdAt) : new Date();
          const skillUpdatedAt = skill.updatedAt ? new Date(skill.updatedAt) : new Date();

          await tx.skill.upsert({
            where: { legacyId: skill.id },
            create: {
              legacyId: skill.id,
              categoryId: upsertedCategory.id,
              name: skill.name,
              code: skill.code ?? null,
              description: skill.description ?? null,
              capabilities: (skill.capabilities ?? []) as Prisma.InputJsonValue,
              displayOrder: skillIndex,
              createdAt: skillCreatedAt,
              updatedAt: skillUpdatedAt,
              deletedAt: null
            },
            update: {
              categoryId: upsertedCategory.id,
              name: skill.name,
              code: skill.code ?? null,
              description: skill.description ?? null,
              capabilities: (skill.capabilities ?? []) as Prisma.InputJsonValue,
              displayOrder: skillIndex,
              updatedAt: skillUpdatedAt,
              deletedAt: null
            }
          });
        }
      }
    });

    return this.getState();
  }
}
