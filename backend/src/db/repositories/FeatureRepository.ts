import { prisma } from "../prismaClient";
import type { CreateFeatureInput, FeatureRecord, UpdateFeatureInput } from "../types";

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : undefined;
}

function normalizeList(items: string[]) {
  return items.map((item) => item.trim()).filter(Boolean);
}

function mapFeature(feature: {
  id: string;
  name: string;
  description: string | null;
  rolesInvolved: string[];
  platforms: string[];
  browsersOrDevices: string[];
  hasApi: boolean;
  createdAt: Date;
  updatedAt: Date;
}) : FeatureRecord {
  return {
    id: feature.id,
    name: feature.name,
    description: feature.description ?? "",
    rolesInvolved: [...feature.rolesInvolved],
    platforms: [...feature.platforms],
    browsersOrDevices: [...feature.browsersOrDevices],
    hasApi: feature.hasApi,
    createdAt: toIso(feature.createdAt),
    updatedAt: toIso(feature.updatedAt)
  };
}

export class FeatureRepository {
  async list() {
    const rows = await prisma.feature.findMany({ orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }] });
    return rows.map(mapFeature);
  }

  async findById(id: string) {
    const row = await prisma.feature.findUnique({ where: { id } });
    return row ? mapFeature(row) : null;
  }

  async create(input: CreateFeatureInput) {
    const row = await prisma.feature.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        rolesInvolved: normalizeList(input.rolesInvolved),
        platforms: normalizeList(input.platforms),
        browsersOrDevices: normalizeList(input.browsersOrDevices),
        hasApi: input.hasApi
      }
    });
    return mapFeature(row);
  }

  async update(id: string, input: UpdateFeatureInput) {
    const row = await prisma.feature.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
        ...(input.rolesInvolved !== undefined ? { rolesInvolved: normalizeList(input.rolesInvolved) } : {}),
        ...(input.platforms !== undefined ? { platforms: normalizeList(input.platforms) } : {}),
        ...(input.browsersOrDevices !== undefined ? { browsersOrDevices: normalizeList(input.browsersOrDevices) } : {}),
        ...(input.hasApi !== undefined ? { hasApi: input.hasApi } : {})
      }
    });
    return mapFeature(row);
  }
}
