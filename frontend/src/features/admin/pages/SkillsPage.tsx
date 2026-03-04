import { useEffect, useMemo, useRef, useState } from "react";
import { AddCapabilityModal } from "../components/AddCapabilityModal";
import { AddSkillCategoryModal } from "../components/AddSkillCategoryModal";
import { AddSkillModal } from "../components/AddSkillModal";
import {
  CapabilityLevelLabel,
  fetchSkillCategoriesPage,
  fetchSkillsByCategoryPage,
  SkillCategoryRecord,
  SkillRecord,
  SkillsState,
  fetchSkillsState,
  getDefaultCapabilitySections,
  getSkillsState,
  updateSkillsState
} from "../data/skillsDb";
import { AdminShell } from "../layout/AdminShell";
import { Button } from "../../../shared/components/Button";
import { ArrowRightIcon, PlusIcon, SearchIcon } from "../../../shared/components/Icons";
import { SortHeaderLabel } from "../../../shared/components/SortHeaderLabel";
import { DataTable } from "../../../shared/components/Table";
import { useToast } from "../../../shared/components/ToastProvider";
import { useQueryResource } from "../../../shared/hooks/useQueryResource";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import { EmptyState, QueryErrorBanner, TableSkeleton } from "../../../shared/components/QueryStates";
import { PaginationControls } from "../../../shared/components/PaginationControls";
import type { PaginatedResult } from "../../../shared/types/pagination";

type CapabilityLevelOption = "Entry" | "Mid" | "Senior" | "Senior Lead";
type ModalMode = "add" | "edit";

type CategoryModalState = { open: boolean; mode: ModalMode; initialValue: string };
type SkillModalState = { open: boolean; mode: ModalMode; initialValue: string };
type CapabilityModalState = {
  open: boolean;
  mode: ModalMode;
  initialValue?: { level: CapabilityLevelOption; capability: string };
};

const levelMap: Record<CapabilityLevelOption, CapabilityLevelLabel> = {
  Entry: "Entry Level",
  Mid: "Mid Level",
  Senior: "Senior Level",
  "Senior Lead": "Senior Lead Level"
};

const reverseLevelMap: Record<CapabilityLevelLabel, CapabilityLevelOption> = {
  "Entry Level": "Entry",
  "Mid Level": "Mid",
  "Senior Level": "Senior",
  "Senior Lead Level": "Senior Lead"
};

function toId(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function withUniqueId(base: string) {
  return `${base}-${Date.now()}`;
}

function BreadcrumbHeader({
  rootLabel,
  currentLabel,
  onBack
}: {
  rootLabel: string;
  currentLabel: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 border-r border-[#d1d1d1] pr-4 text-sm text-[#64748b]"
      >
        <span>←</span>
        <span>{rootLabel}</span>
      </button>
      <span className="text-sm font-medium text-[#242424]">{currentLabel}</span>
    </div>
  );
}

function RowInlineActions({
  onEdit,
  onDelete,
  label,
  align = "right"
}: {
  onEdit: () => void;
  onDelete: () => void;
  label: string;
  align?: "right" | "center";
}) {
  return (
    <div className={`flex items-center gap-2 ${align === "center" ? "justify-center" : "justify-end"} pr-2`}>
      <button
        type="button"
        className="rounded px-2 py-1 text-xs font-medium text-[#1595d4] hover:bg-[#eff8ff]"
        onClick={(event) => {
          event.stopPropagation();
          onEdit();
        }}
        aria-label={`Edit ${label}`}
      >
        Edit
      </button>
      <button
        type="button"
        className="rounded px-2 py-1 text-xs font-medium text-[#ef4444] hover:bg-[#fef2f2]"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        aria-label={`Delete ${label}`}
      >
        Delete
      </button>
    </div>
  );
}

export function SkillsPage() {
  const PAGE_SIZE = 12;
  const skillsResource = useQueryResource<SkillsState>({
    initialData: getSkillsState(),
    fetcher: fetchSkillsState
  });
  const skillsState = skillsResource.data;
  const setSkillsState = skillsResource.setData;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [categoryPage, setCategoryPage] = useState(1);
  const [skillsPage, setSkillsPage] = useState(1);
  const [categorySortBy, setCategorySortBy] = useState<"name" | "skillsCount" | "updatedAt">("name");
  const [skillsSortBy, setSkillsSortBy] = useState<"name" | "capabilityCount" | "updatedAt">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const toggleCategorySort = (nextSortBy: "name" | "skillsCount" | "updatedAt") => {
    setCategorySortBy((previousSortBy) => {
      if (previousSortBy === nextSortBy) {
        setSortDir((previousDir) => (previousDir === "asc" ? "desc" : "asc"));
        return previousSortBy;
      }
      setSortDir("asc");
      return nextSortBy;
    });
  };
  const toggleSkillSort = (nextSortBy: "name" | "capabilityCount" | "updatedAt") => {
    setSkillsSortBy((previousSortBy) => {
      if (previousSortBy === nextSortBy) {
        setSortDir((previousDir) => (previousDir === "asc" ? "desc" : "asc"));
        return previousSortBy;
      }
      setSortDir("asc");
      return nextSortBy;
    });
  };
  const debouncedSearch = useDebouncedValue(searchInput, 180);
  const { showToast } = useToast();
  const searchFieldRef = useRef<HTMLInputElement | null>(null);

  const [categoryModal, setCategoryModal] = useState<CategoryModalState>({
    open: false,
    mode: "add",
    initialValue: ""
  });
  const [skillModal, setSkillModal] = useState<SkillModalState>({ open: false, mode: "add", initialValue: "" });
  const [capabilityModal, setCapabilityModal] = useState<CapabilityModalState>({ open: false, mode: "add" });

  const [editingCapabilityRef, setEditingCapabilityRef] = useState<{ level: CapabilityLevelLabel; index: number } | null>(null);

  useEffect(() => {
    if (!isSearchExpanded) return;
    searchFieldRef.current?.focus();
  }, [isSearchExpanded]);

  const categories = skillsState.categories;
  const categoryRowsResource = useQueryResource<PaginatedResult<{ id: string; name: string }>>({
    initialData: {
      items: categories.slice(0, PAGE_SIZE).map((category) => ({ id: category.id, name: category.name })),
      page: 1,
      pageSize: PAGE_SIZE,
      total: categories.length,
      totalPages: Math.max(1, Math.ceil(categories.length / PAGE_SIZE))
    },
    fetcher: async () => {
      const payload = await fetchSkillCategoriesPage({
        page: categoryPage,
        pageSize: PAGE_SIZE,
        q: debouncedSearch.trim(),
        sortBy: categorySortBy,
        sortDir
      });
      return { ...payload, items: payload.items.map((item) => ({ id: item.id, name: item.name })) };
    },
    deps: [categoryPage, debouncedSearch, categorySortBy, sortDir]
  });
  const skillsRowsResource = useQueryResource<PaginatedResult<{ id: string; name: string }>>({
    initialData: { items: [], page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 },
    fetcher: async () => {
      if (!selectedCategoryId) {
        return { items: [], page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 };
      }
      const payload = await fetchSkillsByCategoryPage({
        categoryId: selectedCategoryId,
        page: skillsPage,
        pageSize: PAGE_SIZE,
        q: debouncedSearch.trim(),
        sortBy: skillsSortBy,
        sortDir
      });
      return { ...payload, items: payload.items.map((item) => ({ id: item.id, name: item.name })) };
    },
    deps: [selectedCategoryId, skillsPage, debouncedSearch, skillsSortBy, sortDir]
  });
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );
  const selectedSkill = useMemo(
    () => selectedCategory?.skills.find((skill) => skill.id === selectedSkillId) ?? null,
    [selectedCategory, selectedSkillId]
  );

  const inCapabilitiesView = Boolean(selectedCategory && selectedSkill);
  const inSkillsView = Boolean(selectedCategory) && !inCapabilitiesView;

  useEffect(() => {
    setCategoryPage(1);
    setSkillsPage(1);
  }, [debouncedSearch, selectedCategoryId, categorySortBy, skillsSortBy, sortDir]);

  const persistState = async (nextState: SkillsState) => {
    const previousState = skillsState;
    setSkillsState(nextState);
    try {
      const persisted = await updateSkillsState(nextState);
      setSkillsState(persisted);
      await Promise.all([
        skillsResource.refetch(),
        categoryRowsResource.refetch(),
        skillsRowsResource.refetch()
      ]);
    } catch (error) {
      setSkillsState(previousState);
      showToast({
        variant: "error",
        title: "Failed to save skills",
        message: error instanceof Error ? error.message : "Please try again."
      });
    }
  };

  const updateCategories = async (updater: (current: SkillCategoryRecord[]) => SkillCategoryRecord[]) => {
    const nextState: SkillsState = { categories: updater(skillsState.categories) };
    await persistState(nextState);
  };

  const updateSelectedCategorySkills = async (updater: (skills: SkillRecord[]) => SkillRecord[]) => {
    if (!selectedCategory) return;
    await updateCategories((current) =>
      current.map((category) =>
        category.id === selectedCategory.id ? { ...category, skills: updater(category.skills) } : category
      )
    );
  };

  const categoryColumns = useMemo(
    () => [
      {
        key: "category",
        label: (
          <SortHeaderLabel active={categorySortBy === "name"} direction={sortDir} onClick={() => toggleCategorySort("name")}>
            Category
          </SortHeaderLabel>
        ),
        render: (row: { id: string; name: string }) => row.name
      },
      {
        key: "actions",
        label: "",
        widthClassName: "w-[180px]",
        render: (row: { id: string; name: string }) => (
          <RowInlineActions
            label={row.name}
            onEdit={() => {
              setSelectedCategoryId(row.id);
              setCategoryModal({ open: true, mode: "edit", initialValue: row.name });
            }}
            onDelete={async () => {
              const nextCategories = categories.filter((category) => category.id !== row.id);
              await persistState({ categories: nextCategories });
              showToast({ variant: "success", title: "Category removed" });
              if (selectedCategoryId === row.id) {
                setSelectedCategoryId(null);
                setSelectedSkillId(null);
              }
            }}
          />
        )
      }
    ],
    [categories, selectedCategoryId, showToast, categorySortBy, sortDir]
  );

  const skillColumns = useMemo(
    () => [
      {
        key: "skill",
        label: (
          <SortHeaderLabel active={skillsSortBy === "name"} direction={sortDir} onClick={() => toggleSkillSort("name")}>
            Skills
          </SortHeaderLabel>
        ),
        render: (row: { id: string; name: string }) => row.name
      },
      {
        key: "actions",
        label: "",
        widthClassName: "w-[180px]",
        render: (row: { id: string; name: string }) => (
          <RowInlineActions
            label={row.name}
            onEdit={() => {
              setSelectedSkillId(row.id);
              setSkillModal({ open: true, mode: "edit", initialValue: row.name });
            }}
            onDelete={async () => {
              await updateSelectedCategorySkills((skills) => skills.filter((skill) => skill.id !== row.id));
              showToast({ variant: "success", title: "Skill removed" });
              if (selectedSkillId === row.id) {
                setSelectedSkillId(null);
              }
            }}
          />
        )
      }
    ],
    [selectedSkillId, showToast, skillsSortBy, sortDir]
  );

  const capabilitySections = selectedSkill?.capabilities ?? [];
  const query = debouncedSearch.trim().toLowerCase();
  const filteredCategories = categoryRowsResource.data.items;
  const filteredSkills = skillsRowsResource.data.items;

  const filteredCapabilitySections = useMemo(() => {
    return capabilitySections.map((section) => ({
      ...section,
      entries: section.entries.filter((entry) => !query || entry.toLowerCase().includes(query))
    }));
  }, [capabilitySections, query]);

  const renderCapabilitySection = (section: { level: CapabilityLevelLabel; entries: string[] }) => {
    const rows = section.entries.map((text, index) => ({ id: `${section.level}-${index}`, text, index }));

    const columns = [
      {
        key: "entry",
        label: section.level,
        render: (row: { text: string }) => row.text
      },
      {
        key: "actions",
        label: "",
        widthClassName: "w-[180px]",
        render: (row: { id: string; text: string; index: number }) => {
          return (
            <RowInlineActions
              label={`${section.level} entry ${row.index + 1}`}
              align="center"
              onEdit={() => {
                setEditingCapabilityRef({ level: section.level, index: row.index });
                setCapabilityModal({
                  open: true,
                  mode: "edit",
                  initialValue: {
                    level: reverseLevelMap[section.level],
                    capability: row.text
                  }
                });
              }}
              onDelete={async () => {
                if (!selectedSkill) return;
                await updateSelectedCategorySkills((skills) =>
                  skills.map((skill) => {
                    if (skill.id !== selectedSkill.id) return skill;
                    return {
                      ...skill,
                      capabilities: skill.capabilities.map((item) =>
                        item.level === section.level
                          ? { ...item, entries: item.entries.filter((_, index) => index !== row.index) }
                          : item
                      )
                    };
                  })
                );
                showToast({ variant: "success", title: "Sub skill removed" });
              }}
            />
          );
        }
      }
    ];

    return (
      <div key={section.level} className="mb-2">
        <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} allowOverflow />
      </div>
    );
  };

  return (
    <AdminShell>
      <AddSkillCategoryModal
        open={categoryModal.open}
        initialValue={categoryModal.initialValue}
        title={categoryModal.mode === "edit" ? "Edit Skill Category" : "Add New Skill Category"}
        saveLabel={categoryModal.mode === "edit" ? "Update" : "Save"}
        onClose={() => setCategoryModal((previous) => ({ ...previous, open: false }))}
        onSave={async (categoryName) => {
          if (categoryModal.mode === "edit" && selectedCategoryId) {
            await updateCategories((current) =>
              current.map((category) =>
                category.id === selectedCategoryId ? { ...category, name: categoryName } : category
              )
            );
            showToast({ variant: "success", title: "Category updated" });
            return;
          }

          const baseId = toId(categoryName) || "category";
          const nextId = withUniqueId(`cat-${baseId}`);
          await updateCategories((previous) => [...previous, { id: nextId, name: categoryName, skills: [] }]);
          showToast({ variant: "success", title: "Category added" });
        }}
      />

      <AddSkillModal
        open={skillModal.open}
        initialValue={skillModal.initialValue}
        title={skillModal.mode === "edit" ? "Edit Skill" : "Add New Skill"}
        saveLabel={skillModal.mode === "edit" ? "Update" : "Save"}
        onClose={() => setSkillModal((previous) => ({ ...previous, open: false }))}
        onSave={async (skillName) => {
          if (!selectedCategory) return;

          if (skillModal.mode === "edit" && selectedSkillId) {
            await updateSelectedCategorySkills((skills) =>
              skills.map((skill) => (skill.id === selectedSkillId ? { ...skill, name: skillName } : skill))
            );
            showToast({ variant: "success", title: "Skill updated" });
            return;
          }

          const baseId = toId(skillName) || "skill";
          const nextSkillId = withUniqueId(`skill-${baseId}`);
          await updateSelectedCategorySkills((skills) => [
            ...skills,
            {
              id: nextSkillId,
              name: skillName,
              capabilities: getDefaultCapabilitySections()
            }
          ]);
          showToast({ variant: "success", title: "Skill added" });
        }}
      />

      <AddCapabilityModal
        open={capabilityModal.open}
        initialValue={capabilityModal.initialValue}
        title={capabilityModal.mode === "edit" ? "Edit Sub Skill" : "Add New Capability"}
        saveLabel={capabilityModal.mode === "edit" ? "Update" : "Save"}
        showSaveAndAddAnother={capabilityModal.mode !== "edit"}
        onClose={() => {
          setCapabilityModal((previous) => ({ ...previous, open: false }));
          setEditingCapabilityRef(null);
        }}
        onSave={async ({ level, capability }) => {
          if (!selectedSkill) return;

          const targetLevel = levelMap[level];
          await updateSelectedCategorySkills((skills) =>
            skills.map((skill) => {
              if (skill.id !== selectedSkill.id) return skill;

              if (capabilityModal.mode === "edit" && editingCapabilityRef) {
                return {
                  ...skill,
                  capabilities: skill.capabilities.map((section) => {
                    if (section.level === editingCapabilityRef.level) {
                      const filtered = section.entries.filter((_, index) => index !== editingCapabilityRef.index);
                      return { ...section, entries: filtered };
                    }
                    return section;
                  }).map((section) =>
                    section.level === targetLevel
                      ? { ...section, entries: [...section.entries, capability] }
                      : section
                  )
                };
              }

              return {
                ...skill,
                capabilities: skill.capabilities.map((section) =>
                  section.level === targetLevel
                    ? { ...section, entries: [...section.entries, capability] }
                    : section
                )
              };
            })
          );
          showToast({
            variant: "success",
            title: capabilityModal.mode === "edit" ? "Sub skill updated" : "Sub skill added"
          });
        }}
      />

      <div className="flex min-h-full flex-1 flex-col bg-white p-4 shadow-[0_10px_20px_rgba(148,163,184,0.2)]">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white pb-2">
          {inSkillsView && selectedCategory ? (
            <BreadcrumbHeader
              rootLabel="Skill Category"
              currentLabel={selectedCategory.name}
              onBack={() => {
                setSelectedCategoryId(null);
                setSelectedSkillId(null);
              }}
            />
          ) : null}

          {inCapabilitiesView && selectedCategory && selectedSkill ? (
            <BreadcrumbHeader
              rootLabel={selectedCategory.name}
              currentLabel={selectedSkill.name}
              onBack={() => setSelectedSkillId(null)}
            />
          ) : null}

          {!inSkillsView && !inCapabilitiesView ? <div /> : null}

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
                  placeholder={inCapabilitiesView ? "Search sub skills" : inSkillsView ? "Search skills" : "Search categories"}
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
            {!inSkillsView && !inCapabilitiesView ? (
              <Button
                variant="primary"
                startIcon={<PlusIcon className="h-4 w-4" />}
                endIcon={<ArrowRightIcon className="h-4 w-4" />}
                onClick={() => setCategoryModal({ open: true, mode: "add", initialValue: "" })}
              >
                New Skills Category
              </Button>
            ) : null}

            {inSkillsView ? (
              <Button
                variant="primary"
                startIcon={<PlusIcon className="h-4 w-4" />}
                endIcon={<ArrowRightIcon className="h-4 w-4" />}
                onClick={() => setSkillModal({ open: true, mode: "add", initialValue: "" })}
              >
                Add New Skill
              </Button>
            ) : null}

            {inCapabilitiesView ? (
              <Button
                variant="primary"
                startIcon={<PlusIcon className="h-4 w-4" />}
                endIcon={<ArrowRightIcon className="h-4 w-4" />}
                onClick={() => setCapabilityModal({ open: true, mode: "add" })}
              >
                Add New Capability
              </Button>
            ) : null}
          </div>
        </header>

        <main className="pt-2">
          {skillsResource.error ? (
            <QueryErrorBanner
              error="Failed to load skills data. Please retry."
              onRetry={() => {
                void skillsResource.refetch();
              }}
            />
          ) : null}
          {!inSkillsView && !inCapabilitiesView ? (
            skillsResource.isLoading && categories.length === 0 ? (
              <TableSkeleton rows={7} />
            ) : filteredCategories.length === 0 ? (
              <EmptyState title="No categories found" message="Try updating your search." />
            ) : (
              <DataTable
                columns={categoryColumns}
                rows={filteredCategories}
                rowKey={(row) => row.id}
                allowOverflow
                emptyMessage="No categories found."
                onRowClick={(row) => {
                  setSelectedCategoryId(row.id);
                  setSelectedSkillId(null);
                }}
              />
            )
          ) : null}
          {!inSkillsView && !inCapabilitiesView ? (
            <PaginationControls
              page={categoryRowsResource.data.page}
              totalPages={categoryRowsResource.data.totalPages}
              total={categoryRowsResource.data.total}
              pageSize={categoryRowsResource.data.pageSize}
              onPageChange={setCategoryPage}
            />
          ) : null}

          {inSkillsView && selectedCategory ? (
            filteredSkills.length === 0 ? (
              <EmptyState title="No skills found" message="Try updating your search." />
            ) : (
              <DataTable
                columns={skillColumns}
                rows={filteredSkills}
                rowKey={(row) => row.id}
                allowOverflow
                emptyMessage="No skills found."
                onRowClick={(row) => setSelectedSkillId(row.id)}
              />
            )
          ) : null}
          {inSkillsView && selectedCategory ? (
            <PaginationControls
              page={skillsRowsResource.data.page}
              totalPages={skillsRowsResource.data.totalPages}
              total={skillsRowsResource.data.total}
              pageSize={skillsRowsResource.data.pageSize}
              onPageChange={setSkillsPage}
            />
          ) : null}

          {inCapabilitiesView ? <div>{filteredCapabilitySections.map((section) => renderCapabilitySection(section))}</div> : null}
        </main>
      </div>
    </AdminShell>
  );
}
