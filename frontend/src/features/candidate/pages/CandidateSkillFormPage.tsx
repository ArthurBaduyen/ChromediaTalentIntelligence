import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CandidateProfileSkillSelection,
  CandidateProfileSkillSelectionItem,
  CandidateRecord,
  fetchPublicCandidateByToken,
  updatePublicCandidateSkills
} from "../../admin/data/candidatesDb";
import { SkillsState, fetchSkillsState } from "../../admin/data/skillsDb";
import { Button } from "../../../shared/components/Button";
import { CloseIcon } from "../../../shared/components/Icons";
import { useToast } from "../../../shared/components/ToastProvider";
import { APP_ROUTES } from "../../../shared/config/routes";
import { useUnsavedChangesGuard } from "../../../shared/hooks/useUnsavedChangesGuard";

const brandLogo = "https://www.figma.com/api/mcp/asset/18a2c059-6d4d-42f8-a8b2-1256d07938c5";
const robotImage = "https://www.figma.com/api/mcp/asset/71ac08ef-03de-4e0f-ba0f-021b276f40a5";
const DEFAULT_BOT_HEADLINE = "Each skill you add helps us match better roles faster.";
const DEFAULT_BOT_SUBLINE =
  "You're improving your profile visibility. Select only the skills you're truly comfortable with.";

type BotLine = { headline: string; subline: string };

const BOT_LINES: Record<string, BotLine[]> = {
  firstCheck: [
    {
      headline: "Great start.",
      subline: "Continue with the skills you can confidently explain and apply."
    },
    {
      headline: "Nice first selection.",
      subline: "Honest inputs help us match you to better-fit roles."
    },
    {
      headline: "You’re off to a good start.",
      subline: "Choose only skills you’re comfortable using at work."
    }
  ],
  refineAnswer: [
    {
      headline: "Nice refinement. Accurate answers improve your match quality.",
      subline: "Only keep skills you can confidently discuss in interviews."
    },
    {
      headline: "Good update.",
      subline: "Clear and honest selections help recruiters evaluate fit faster."
    },
    {
      headline: "Thanks for refining that.",
      subline: "Precision here improves role relevance later."
    }
  ],
  carefulSelection: [
    {
      headline: "Quick reminder: quality over quantity.",
      subline: "Select only skills you're truly comfortable applying in real projects."
    },
    {
      headline: "Take a quick pause.",
      subline: "It’s better to be accurate than to check everything."
    },
    {
      headline: "Keep it honest and focused.",
      subline: "Choose skills you can confidently demonstrate."
    }
  ],
  steadyProgress: [
    {
      headline: "Nice momentum.",
      subline: "You're improving profile visibility with every accurate selection."
    },
    {
      headline: "Great consistency.",
      subline: "Thoughtful selections increase your chance of better matches."
    },
    {
      headline: "You’re doing well.",
      subline: "Keep selecting only the skills you’d use confidently."
    }
  ],
  idleEncourage: [
    {
      headline: "Take your time. Accuracy matters more than speed.",
      subline: "Careful selections help us recommend better-fitting roles."
    },
    {
      headline: "No rush here.",
      subline: "Thoughtful answers improve role matching quality."
    },
    {
      headline: "Pause and review if needed.",
      subline: "Your honest profile helps us represent you better."
    }
  ],
  categoryComplete: [
    {
      headline: "Great job. {category} is complete.",
      subline: "Thoughtful selections help us match you to stronger opportunities."
    },
    {
      headline: "Nice work finishing {category}.",
      subline: "That gives us a clearer picture of your strengths."
    },
    {
      headline: "{category} completed.",
      subline: "You can move to the next section when you're ready."
    }
  ]
};

function pickBotLine(group: keyof typeof BOT_LINES, vars?: Record<string, string>): BotLine {
  const lines = BOT_LINES[group];
  const chosen = lines[Math.floor(Math.random() * lines.length)] ?? {
    headline: DEFAULT_BOT_HEADLINE,
    subline: DEFAULT_BOT_SUBLINE
  };
  if (!vars) return chosen;
  const interpolate = (value: string) =>
    value.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
  return {
    headline: interpolate(chosen.headline),
    subline: interpolate(chosen.subline)
  };
}

function capabilityIdForEntry(skillId: string, level: string, index: number) {
  return `${skillId}::${level}::${index}`;
}

function entryKey(skillId: string, level: string, capabilityId: string) {
  return capabilityId;
}

function parseKey(value: string): CandidateProfileSkillSelectionItem | null {
  const [skillId, level] = value.split("::");
  if (!skillId || !level) return null;
  return { skillId, level, capabilityId: value };
}

function buildSelectionsFromDraft(
  categories: { id: string }[],
  draft: Record<string, string[]>
): CandidateProfileSkillSelection[] {
  return categories.map((category) => ({
    categoryId: category.id,
    selectedSubSkills: (draft[category.id] ?? [])
      .map(parseKey)
      .filter((item): item is CandidateProfileSkillSelectionItem => item !== null)
  }));
}

export function CandidateSkillFormPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [candidate, setCandidate] = useState<CandidateRecord | null>(null);
  const [skillsState, setSkillsState] = useState<SkillsState>({ categories: [] });
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [draftSelections, setDraftSelections] = useState<Record<string, string[]>>({});
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [isAddMoreSkillsModalOpen, setIsAddMoreSkillsModalOpen] = useState(false);
  const [extraCategoryIds, setExtraCategoryIds] = useState<string[]>([]);
  const [focusedCategoryIds, setFocusedCategoryIds] = useState<string[] | null>(null);
  const [botHeadline, setBotHeadline] = useState(DEFAULT_BOT_HEADLINE);
  const [botSubline, setBotSubline] = useState(DEFAULT_BOT_SUBLINE);
  const [lastInteractionAt, setLastInteractionAt] = useState(() => Date.now());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const lastBotMessageAtRef = useRef(0);
  const lastBotMessageKeyRef = useRef("default");
  const recentActionTimesRef = useRef<number[]>([]);
  const autoSaveTimerRef = useRef<number | null>(null);
  const hasHydratedDraftRef = useRef(false);
  const lastSavedSelectionHashRef = useRef("");
  const isSavingRef = useRef(false);
  const queuedSaveRef = useRef(false);
  const latestDraftSelectionsRef = useRef<Record<string, string[]>>({});
  const latestSelectionCategoriesRef = useRef<{ id: string }[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchPublicCandidateByToken(token).then((record) => {
      if (mounted) setCandidate(record);
    });
    fetchSkillsState().then((state) => {
      if (mounted) setSkillsState(state);
    });
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    const source = candidate?.profile?.skillSelections ?? [];
    const nextDraft: Record<string, string[]> = {};
    for (const selection of source) {
      nextDraft[selection.categoryId] = selection.selectedSubSkills.map((item) =>
        entryKey(item.skillId, item.level, item.capabilityId)
      );
    }
    setDraftSelections(nextDraft);
    hasHydratedDraftRef.current = true;
    lastSavedSelectionHashRef.current = JSON.stringify(source);
    setHasUnsavedChanges(false);
  }, [candidate?.id, candidate?.profile?.skillSelections]);

  useUnsavedChangesGuard(hasUnsavedChanges);

  const selectionCategories = useMemo(() => {
    const selectedIds = (candidate?.profile?.skillSelections ?? []).map((selection) => selection.categoryId);
    const fromCandidate = skillsState.categories.filter((category) => selectedIds.includes(category.id));
    if (focusedCategoryIds && focusedCategoryIds.length > 0) {
      return fromCandidate.filter((category) => focusedCategoryIds.includes(category.id));
    }
    if (fromCandidate.length > 0) {
      return fromCandidate;
    }
    return skillsState.categories.slice(0, 4);
  }, [candidate?.profile?.skillSelections, focusedCategoryIds, skillsState.categories]);

  const activeCategory = selectionCategories[activeCategoryIndex] ?? null;
  const isFirstStep = activeCategoryIndex === 0;
  const isLastStep = selectionCategories.length > 0 && activeCategoryIndex >= selectionCategories.length - 1;
  const selectedCategoryIds = useMemo(() => selectionCategories.map((category) => category.id), [selectionCategories]);
  const categoryIndexMap = useMemo(
    () => Object.fromEntries(selectionCategories.map((category, index) => [category.id, index])),
    [selectionCategories]
  );
  const categoryEntryCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const category of selectionCategories) {
      map[category.id] = category.skills.reduce(
        (skillTotal, skill) =>
          skillTotal + skill.capabilities.reduce((capabilityTotal, group) => capabilityTotal + group.entries.length, 0),
        0
      );
    }
    return map;
  }, [selectionCategories]);
  const totalCheckboxes = useMemo(
    () =>
      selectionCategories.reduce(
        (sum, category) =>
          sum +
          category.skills.reduce(
            (skillSum, skill) =>
              skillSum + skill.capabilities.reduce((capabilitySum, group) => capabilitySum + group.entries.length, 0),
            0
          ),
        0
      ),
    [selectionCategories]
  );
  const checkedCheckboxes = useMemo(
    () => selectionCategories.reduce((sum, category) => sum + (draftSelections[category.id]?.length ?? 0), 0),
    [draftSelections, selectionCategories]
  );
  const categorySelectedCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const category of selectionCategories) {
      map[category.id] = draftSelections[category.id]?.length ?? 0;
    }
    return map;
  }, [draftSelections, selectionCategories]);
  const progressPercent = totalCheckboxes > 0 ? Math.min(100, Math.round((checkedCheckboxes / totalCheckboxes) * 100)) : 0;
  const selectedCategoryCount = useMemo(
    () => selectionCategories.filter((category) => (draftSelections[category.id]?.length ?? 0) > 0).length,
    [draftSelections, selectionCategories]
  );
  const stepStorageKey = `chromedia.candidate.skill-step.v1:${candidate?.id ?? token}`;

  const pushBotMessage = (params: { key: string; headline: string; subline: string; cooldownMs?: number }) => {
    const now = Date.now();
    const cooldownMs = params.cooldownMs ?? 6000;
    if (now - lastBotMessageAtRef.current < cooldownMs) {
      return;
    }
    if (lastBotMessageKeyRef.current === params.key && now - lastBotMessageAtRef.current < 20000) {
      return;
    }

    lastBotMessageAtRef.current = now;
    lastBotMessageKeyRef.current = params.key;
    setBotHeadline(params.headline);
    setBotSubline(params.subline);
  };

  useEffect(() => {
    latestDraftSelectionsRef.current = draftSelections;
  }, [draftSelections]);

  useEffect(() => {
    latestSelectionCategoriesRef.current = selectionCategories.map((category) => ({ id: category.id }));
  }, [selectionCategories]);

  const toggleEntry = (categoryId: string, skillId: string, level: string, capabilityId: string) => {
    const key = entryKey(skillId, level, capabilityId);
    const now = Date.now();
    setLastInteractionAt(now);
    setDraftSelections((previous) => {
      const current = previous[categoryId] ?? [];
      const exists = current.includes(key);
      const nextValues = exists ? current.filter((item) => item !== key) : [...current, key];
      const previousTotal = Object.values(previous).reduce((sum, values) => sum + values.length, 0);
      const nextTotal = previousTotal + (exists ? -1 : 1);
      const categoryTarget = categoryEntryCountMap[categoryId] ?? 0;

      if (!exists) {
        recentActionTimesRef.current = [...recentActionTimesRef.current.filter((time) => now - time < 12000), now];
      } else {
        recentActionTimesRef.current = recentActionTimesRef.current.filter((time) => now - time < 12000);
      }

      const rapidActionCount = recentActionTimesRef.current.length;

      if (exists) {
        const line = pickBotLine("refineAnswer");
        pushBotMessage({
          key: "refine-answer",
          headline: line.headline,
          subline: line.subline
        });
      } else if (rapidActionCount >= 8) {
        const line = pickBotLine("carefulSelection");
        pushBotMessage({
          key: "careful-selection",
          headline: line.headline,
          subline: line.subline
        });
      } else if (nextValues.length === categoryTarget && categoryTarget > 0) {
        const categoryName = selectionCategories.find((category) => category.id === categoryId)?.name ?? "this section";
        const line = pickBotLine("categoryComplete", { category: categoryName });
        pushBotMessage({
          key: `category-complete-${categoryId}`,
          headline: line.headline,
          subline: line.subline,
          cooldownMs: 1000
        });
      } else if (previousTotal === 0 && nextTotal === 1) {
        const line = pickBotLine("firstCheck");
        pushBotMessage({
          key: "first-check",
          headline: line.headline,
          subline: line.subline
        });
      } else if (!exists && nextTotal > 0 && nextTotal % 6 === 0) {
        const line = pickBotLine("steadyProgress");
        pushBotMessage({
          key: "steady-progress",
          headline: line.headline,
          subline: line.subline
        });
      }

      return {
        ...previous,
        [categoryId]: nextValues
      };
    });
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = Date.now();
      if (now - lastInteractionAt < 45000) return;
      const line = pickBotLine("idleEncourage");
      pushBotMessage({
        key: "idle-encourage",
        headline: line.headline,
        subline: line.subline
      });
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [lastInteractionAt]);

  const saveProgress = async () => {
    if (!candidate) return null;

    if (isSavingRef.current) {
      queuedSaveRef.current = true;
      return null;
    }

    isSavingRef.current = true;
    let latestSaved: CandidateRecord | null = null;

    try {
      do {
        queuedSaveRef.current = false;
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const liveDraftSelections = latestDraftSelectionsRef.current;
            const liveSelectionCategories = latestSelectionCategoriesRef.current;
            const mergedSelectionsMap = new Map(
              buildSelectionsFromDraft(liveSelectionCategories, liveDraftSelections).map((selection) => [selection.categoryId, selection])
            );
            const untouchedExistingSelections = (candidate.profile?.skillSelections ?? []).filter(
              (selection) => !mergedSelectionsMap.has(selection.categoryId)
            );
            const mergedUpdatedSelections = liveSelectionCategories
              .map((category) => mergedSelectionsMap.get(category.id))
              .filter((selection): selection is CandidateProfileSkillSelection => Boolean(selection));
            const mergedSelections = [...untouchedExistingSelections, ...mergedUpdatedSelections];

            const updated = await updatePublicCandidateSkills(token, mergedSelections);
            setCandidate(updated);
            lastSavedSelectionHashRef.current = JSON.stringify(mergedSelections);
            setHasUnsavedChanges(false);
            latestSaved = updated;
            break;
          } catch (error) {
            lastError = error;
            await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
          }
        }

        if (!latestSaved && lastError) {
          showToast({
            variant: "error",
            title: "Failed to save",
            message: lastError instanceof Error ? lastError.message : undefined
          });
          break;
        }
      } while (queuedSaveRef.current);
      return latestSaved;
    } finally {
      isSavingRef.current = false;
    }
  };

  useEffect(() => {
    if (!candidate || !hasHydratedDraftRef.current) return;
    const existingSelections = candidate.profile?.skillSelections ?? [];
    const updatedSelectionMap = new Map(
      buildSelectionsFromDraft(selectionCategories, draftSelections).map((selection) => [selection.categoryId, selection])
    );
    const untouchedExisting = existingSelections.filter((selection) => !updatedSelectionMap.has(selection.categoryId));
    const mergedUpdated = selectionCategories
      .map((category) => updatedSelectionMap.get(category.id))
      .filter((selection): selection is CandidateProfileSkillSelection => Boolean(selection));
    const nextSelections = [...untouchedExisting, ...mergedUpdated];
    const nextHash = JSON.stringify(nextSelections);
    if (nextHash === lastSavedSelectionHashRef.current) {
      setHasUnsavedChanges(false);
      return;
    }
    setHasUnsavedChanges(true);

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = window.setTimeout(() => {
      void saveProgress();
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [candidate, draftSelections, selectionCategories]);

  useEffect(() => {
    if (selectionCategories.length === 0) return;
    const storedCategoryId = window.localStorage.getItem(stepStorageKey);
    if (!storedCategoryId) return;
    const storedIndex = selectionCategories.findIndex((category) => category.id === storedCategoryId);
    if (storedIndex >= 0) {
      setActiveCategoryIndex(storedIndex);
    }
  }, [selectionCategories, stepStorageKey]);

  useEffect(() => {
    const currentCategory = selectionCategories[activeCategoryIndex];
    if (!currentCategory) return;
    window.localStorage.setItem(stepStorageKey, currentCategory.id);
  }, [activeCategoryIndex, selectionCategories, stepStorageKey]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.altKey || event.metaKey)) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        const nextIndex = Math.min(activeCategoryIndex + 1, selectionCategories.length - 1);
        setActiveCategoryIndex(nextIndex);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const previousIndex = Math.max(activeCategoryIndex - 1, 0);
        setActiveCategoryIndex(previousIndex);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeCategoryIndex, selectionCategories.length]);

  const jumpToSkill = (categoryId: string, skillId: string) => {
    const targetIndex = categoryIndexMap[categoryId];
    if (typeof targetIndex === "number") {
      setActiveCategoryIndex(targetIndex);
    }

    const panelId = `skill-panel-${categoryId}-${skillId}`;
    const scrollTarget = () => {
      const panel = document.getElementById(panelId);
      if (!panel) return false;
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    };

    if (!scrollTarget()) {
      window.setTimeout(() => {
        void scrollTarget();
      }, 80);
    }
  };

  const copyStartLink = async () => {
    const url = `${window.location.origin}${APP_ROUTES.candidate.start(token)}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast({ variant: "success", title: "Link copied" });
    } catch {
      showToast({ variant: "error", title: "Unable to copy link" });
    }
  };

  const addMoreCategories = async () => {
    if (!candidate) return;
    const newCategoryIds = extraCategoryIds.filter((id) => !selectedCategoryIds.includes(id));
    if (newCategoryIds.length === 0) {
      showToast({ variant: "error", title: "Select at least one new category" });
      return;
    }

    const existingSelections = candidate.profile?.skillSelections ?? [];
    const nextSelections: CandidateProfileSkillSelection[] = [
      ...existingSelections,
      ...newCategoryIds.map((categoryId) => ({
        categoryId,
        selectedSubSkills: []
      }))
    ];

    try {
      const updated = await updatePublicCandidateSkills(token, nextSelections);
      setFocusedCategoryIds((previous) => {
        if (!previous || previous.length === 0) {
          return newCategoryIds;
        }
        return [...new Set([...previous, ...newCategoryIds])];
      });
      setCandidate(updated);
      setIsAddMoreSkillsModalOpen(false);
      setExtraCategoryIds([]);
      setActiveCategoryIndex(0);
      showToast({ variant: "success", title: "More skill categories added" });
    } catch (error) {
      showToast({
        variant: "error",
        title: "Failed to add categories",
        message: error instanceof Error ? error.message : undefined
      });
    }
  };

  return (
    <main className="h-screen overflow-hidden bg-white">
      <div className="flex h-full rounded-[4px] bg-white">
        <aside className="sticky top-0 h-screen w-[377px] shrink-0 overflow-y-auto bg-[#f1f5f9] px-4 py-8">
          <div className="flex flex-col items-center justify-center pb-8">
            <img src={brandLogo} alt="Chromedia" className="h-[70px] w-[347px] object-cover" />
          </div>
          <div className="px-4">
            {selectionCategories.map((category, index) => {
              const isActive = activeCategory?.id === category.id;
              return (
                <div key={category.id} className="pb-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 py-4 text-left"
                    onClick={() => setActiveCategoryIndex(index)}
                  >
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-full text-base ${
                        isActive ? "bg-[#1595d4] text-white" : "bg-[#ececec] text-[#070a13]"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className="truncate text-base font-semibold leading-6 text-[#494949]">{category.name}</span>
                      <span className="shrink-0 text-xs font-medium text-[#667085]">
                        {categorySelectedCountMap[category.id] ?? 0}/{categoryEntryCountMap[category.id] ?? 0}
                      </span>
                    </div>
                  </button>
                  {isActive ? (
                    <div className="ml-12 mt-1 space-y-2">
                      {category.skills.map((skill) => (
                        <button
                          key={skill.id}
                          type="button"
                          className="block w-full truncate text-left text-xs font-semibold uppercase tracking-[0.02em] text-[#344054] hover:text-[#1595d4]"
                          onClick={() => jumpToSkill(category.id, skill.id)}
                        >
                          • {skill.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </aside>

        <section className="flex h-screen min-h-0 flex-1 flex-col overflow-y-auto bg-white p-4">
          {activeCategory ? (
            <>
              <div className="rounded-2xl border border-[#efefef] p-2">
                <div className="flex items-center gap-4">
                  <img src={robotImage} alt="Robot helper" className="h-[111px] w-[141px] object-cover" />
                  <div className="relative flex-1">
                    <div className="relative inline-block w-fit max-w-[980px] rounded-2xl border border-[#dbe3ea] bg-white px-5 py-3 shadow-[0_4px_10px_rgba(15,23,42,0.06)]">
                      <span className="absolute -left-2 top-8 h-4 w-4 rotate-45 border-b border-l border-[#dbe3ea] bg-white" />
                      <p className="text-[20px] leading-[30px] text-[#494949]">
                        {botHeadline}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-[#667085]">
                        {botSubline}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
 
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-24">
                <div className="space-y-0">
                  {activeCategory.skills.map((skill) => (
                    <article
                      key={skill.id}
                      id={`skill-panel-${activeCategory.id}-${skill.id}`}
                      className="overflow-hidden border border-[#eaecf0] bg-white"
                    >
                      <div className="flex h-11 items-center border-b border-[#eaecf0] bg-[#f4f8fa] px-6">
                        <p className="text-xs font-bold text-[#2c2c2c]">{skill.name}</p>
                      </div>
                      <div className="px-[2px] py-4">
                        <div className="space-y-3 pl-4 pr-3">
                          <div className="rounded-lg px-2 py-2">
                            <div className="space-y-1">
                              {skill.capabilities.flatMap((group) =>
                                group.entries.map((entry, index) => ({
                                  level: group.level,
                                  entry,
                                  capabilityId: capabilityIdForEntry(skill.id, group.level, index)
                                }))
                              ).map((item, entryIndex) => {
                                const key = entryKey(skill.id, item.level, item.capabilityId);
                                const checked = (draftSelections[activeCategory.id] ?? []).includes(key);
                                return (
                                  <label
                                    key={key}
                                    className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm leading-6 text-[#344054] transition-colors hover:bg-white ${
                                      entryIndex % 2 === 0 ? "bg-white" : "bg-[#f1f5f9]"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleEntry(activeCategory.id, skill.id, item.level, item.capabilityId)}
                                      aria-label={`${skill.name} - ${item.entry}`}
                                      className="h-5 w-5 shrink-0 accent-[#1595d4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1595d4] focus-visible:ring-offset-2"
                                    />
                                    <span className="flex-1">{item.entry}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="sticky bottom-0 z-30 mt-2 flex shrink-0 gap-4 border-t border-[#eaecf0] bg-white pt-3">
                {!isFirstStep ? (
                  <Button
                    variant="secondary"
                    className="h-9 flex-1"
                    onClick={() => setActiveCategoryIndex((previous) => Math.max(previous - 1, 0))}
                  >
                    Previous
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  className={`h-9 ${isFirstStep ? "w-full" : "flex-1"}`}
                  onClick={() => {
                    void saveProgress();
                    if (isLastStep) {
                      setIsCompletionModalOpen(true);
                      return;
                    }
                    setActiveCategoryIndex((previous) => Math.min(previous + 1, selectionCategories.length - 1));
                  }}
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <div className="mx-auto mt-10 w-full max-w-[540px] rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-6 text-center">
              <h3 className="text-lg font-semibold text-[#0f172a]">No skills assigned yet</h3>
              <p className="mt-2 text-sm leading-6 text-[#475467]">
                You currently don&apos;t have any skill categories to answer. You can add skills now or go back to start.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button
                  variant="primary"
                  className="h-10 px-5 text-sm"
                  onClick={() => setIsAddMoreSkillsModalOpen(true)}
                >
                  Add skills now
                </Button>
                <Button
                  variant="secondary"
                  className="h-10 px-5 text-sm"
                  onClick={() => navigate(APP_ROUTES.candidate.start(token))}
                >
                  Back to start
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {isCompletionModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-[640px] rounded-2xl bg-white p-6">
            <div className="flex items-start justify-between">
              <h2 className="text-[22px] font-semibold leading-8 text-[#101828]">Great work, you&apos;re done with this set</h2>
              <button
                type="button"
                className="text-[#667085] hover:text-[#344054]"
                onClick={() => setIsCompletionModalOpen(false)}
                aria-label="Close"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-base leading-6 text-[#475467]">
              You can add more skills not covered during the interview, and share this link with friends so they can submit their own skill profile.
            </p>
            <p className="mt-2 text-sm font-medium text-[#344054]">
              You selected {checkedCheckboxes} skills across {selectedCategoryCount} categories.
            </p>
            <p className="mt-2 text-sm leading-5 text-[#667085]">
              Your responses are used only for matching and evaluation.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                className="h-10 px-5 text-sm"
                onClick={() => {
                  setIsCompletionModalOpen(false);
                  setIsAddMoreSkillsModalOpen(true);
                }}
              >
                Add more skills
              </Button>
              <Button variant="secondary" className="h-10 px-5 text-sm" onClick={() => void copyStartLink()}>
                Share with friends
              </Button>
              <Button
                variant="secondary"
                className="ml-auto h-10 px-5 text-sm"
                onClick={() => navigate(APP_ROUTES.candidate.start(token))}
              >
                Done for now
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isAddMoreSkillsModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-[640px] rounded-2xl bg-white p-6">
            <div className="flex items-start justify-between">
              <h2 className="text-[22px] font-semibold leading-8 text-[#101828]">Add More Skills</h2>
              <button
                type="button"
                className="text-[#667085] hover:text-[#344054]"
                onClick={() => setIsAddMoreSkillsModalOpen(false)}
                aria-label="Close"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#475467]">Also comfortable with:</p>
            <div className="mt-4 max-h-[380px] overflow-y-auto rounded-lg border border-[#eaecf0] p-4">
              <div className="space-y-3">
                {skillsState.categories.map((category) => {
                  const isAlreadySelected = selectedCategoryIds.includes(category.id);
                  const checked = isAlreadySelected || extraCategoryIds.includes(category.id);
                  return (
                    <label key={category.id} className="flex items-center gap-3 text-sm leading-5 text-[#344054]">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isAlreadySelected}
                        onChange={(event) => {
                          const isChecked = event.target.checked;
                          setExtraCategoryIds((previous) => {
                            if (isChecked) return [...previous, category.id];
                            return previous.filter((id) => id !== category.id);
                          });
                        }}
                        className="h-4 w-4 accent-[#1595d4]"
                      />
                      <span>{category.name}</span>
                      {isAlreadySelected ? <span className="text-xs text-[#98a2b3]">(Already included)</span> : null}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <Button variant="secondary" className="h-10 px-5 text-sm" onClick={() => setIsAddMoreSkillsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" className="h-10 px-5 text-sm" onClick={() => void addMoreCategories()}>
                Add selected skills
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
