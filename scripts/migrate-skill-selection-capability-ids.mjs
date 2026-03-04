import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const candidatesFile = path.join(root, 'db', 'candidates.json');
const skillsFile = path.join(root, 'db', 'skills.json');

function capabilityIdForEntry(skillId, level, index) {
  return `${skillId}::${level}::${index}`;
}

function textKey(skillId, level, text) {
  return `${skillId}::${level}::${String(text ?? '').trim().toLowerCase()}`;
}

function buildLookup(skillsState) {
  const idSet = new Set();
  const textToId = new Map();
  const idToMeta = new Map();

  for (const category of skillsState.categories ?? []) {
    for (const skill of category.skills ?? []) {
      for (const group of skill.capabilities ?? []) {
        for (const [index, entry] of (group.entries ?? []).entries()) {
          const id = capabilityIdForEntry(skill.id, group.level, index);
          idSet.add(id);
          idToMeta.set(id, { skillId: skill.id, level: group.level });
          textToId.set(textKey(skill.id, group.level, entry), id);
        }
      }
    }
  }

  return { idSet, textToId, idToMeta };
}

function migrateCandidates(candidates, lookup) {
  let changed = 0;

  const migrated = candidates.map((candidate) => {
    const profile = candidate?.profile;
    if (!profile || !Array.isArray(profile.skillSelections)) {
      return candidate;
    }

    let candidateChanged = false;
    const nextSelections = profile.skillSelections.map((selection) => {
      const dedupe = new Set();
      const nextItems = [];

      for (const item of selection.selectedSubSkills ?? []) {
        const capabilityId =
          (item?.capabilityId && lookup.idSet.has(item.capabilityId) ? item.capabilityId : undefined) ??
          (item?.text ? lookup.textToId.get(textKey(item.skillId, item.level, item.text)) : undefined);

        if (!capabilityId || dedupe.has(capabilityId)) continue;
        dedupe.add(capabilityId);

        const meta = lookup.idToMeta.get(capabilityId);
        nextItems.push({
          skillId: meta?.skillId ?? item.skillId,
          level: meta?.level ?? item.level,
          capabilityId
        });
      }

      const prevSerialized = JSON.stringify(selection.selectedSubSkills ?? []);
      const nextSerialized = JSON.stringify(nextItems);
      if (prevSerialized !== nextSerialized) {
        candidateChanged = true;
      }

      return {
        categoryId: selection.categoryId,
        selectedSubSkills: nextItems
      };
    });

    if (!candidateChanged) return candidate;
    changed += 1;

    return {
      ...candidate,
      profile: {
        ...profile,
        skillSelections: nextSelections
      }
    };
  });

  return { migrated, changed };
}

async function main() {
  const [skillsRaw, candidatesRaw] = await Promise.all([
    fs.readFile(skillsFile, 'utf8'),
    fs.readFile(candidatesFile, 'utf8')
  ]);

  const skillsState = JSON.parse(skillsRaw);
  const candidates = JSON.parse(candidatesRaw);

  if (!Array.isArray(candidates)) {
    throw new Error('candidates.json must be an array');
  }

  const lookup = buildLookup(skillsState);
  const { migrated, changed } = migrateCandidates(candidates, lookup);

  await fs.writeFile(candidatesFile, JSON.stringify(migrated, null, 2), 'utf8');
  console.log(`Migration complete. Updated ${changed} candidate record(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
