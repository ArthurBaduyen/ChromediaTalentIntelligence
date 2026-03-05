import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "../layout/AdminShell";
import { Button } from "../../../shared/components/Button";
import { FormInputField } from "../../../shared/components/FormInputField";
import { FormSelectField } from "../../../shared/components/FormSelectField";
import { ModalShell } from "../../../shared/components/ModalShell";
import { useToast } from "../../../shared/components/ToastProvider";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import {
  createFeature,
  createFeatureTestCase,
  deleteTestCase,
  downloadTestCasesCsv,
  fetchFeatureTestCases,
  fetchFeatures,
  generateFeatureTestCases,
  type FeatureRecord,
  type TestCaseBundleKey,
  type TestCaseInput,
  type TestCasePriority,
  type TestCaseRecord,
  type TestCaseType,
  updateTestCase
} from "../data/testCasesDb";

type EditorState = {
  id?: string;
  title: string;
  preconditions: string;
  testData: string;
  steps: string;
  expectedResults: string;
  postConditions: string;
  priority: TestCasePriority;
  type: TestCaseType;
  isAutomatable: boolean;
  automationNotes: string;
  tags: string;
};

const TEST_TYPES: TestCaseType[] = ["Smoke", "Functional", "Negative", "Regression", "API", "Integration", "UI", "Security", "Performance"];
const TEST_PRIORITIES: TestCasePriority[] = ["P0", "P1", "P2"];
const BUNDLES: TestCaseBundleKey[] = [
  "smoke",
  "functional",
  "negative",
  "permissions",
  "api",
  "integration",
  "compatibility",
  "performance",
  "security",
  "regression"
];

function toEditorState(record?: TestCaseRecord): EditorState {
  if (!record) {
    return {
      title: "",
      preconditions: "",
      testData: "{}",
      steps: "",
      expectedResults: "",
      postConditions: "",
      priority: "P1",
      type: "Functional",
      isAutomatable: true,
      automationNotes: "",
      tags: ""
    };
  }

  return {
    id: record.id,
    title: record.title,
    preconditions: record.preconditions,
    testData: JSON.stringify(record.testData ?? {}, null, 2),
    steps: record.steps.join("\n"),
    expectedResults: record.expectedResults.join("\n"),
    postConditions: record.postConditions,
    priority: record.priority,
    type: record.type,
    isAutomatable: record.isAutomatable,
    automationNotes: record.automationNotes,
    tags: record.tags.join(", ")
  };
}

function parseLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateEditor(state: EditorState) {
  const errors: Record<string, string> = {};
  if (!state.title.trim()) errors.title = "Title is required.";
  if (!state.priority) errors.priority = "Priority is required.";
  if (!state.type) errors.type = "Type is required.";
  if (parseLines(state.steps).length === 0) errors.steps = "At least one step is required.";
  if (parseLines(state.expectedResults).length === 0) errors.expectedResults = "At least one expected result is required.";
  if (state.testData.trim()) {
    try {
      JSON.parse(state.testData);
    } catch {
      errors.testData = "Test data must be valid JSON.";
    }
  }
  return errors;
}

function toCreateInput(featureId: string, state: EditorState): TestCaseInput {
  return {
    featureId,
    title: state.title.trim(),
    preconditions: state.preconditions.trim(),
    testData: state.testData.trim() ? JSON.parse(state.testData) : {},
    steps: parseLines(state.steps),
    expectedResults: parseLines(state.expectedResults),
    postConditions: state.postConditions.trim(),
    priority: state.priority,
    type: state.type,
    isAutomatable: state.isAutomatable,
    automationNotes: state.automationNotes.trim(),
    tags: state.tags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  };
}

export function TestCasesPage() {
  const { showToast } = useToast();
  const [features, setFeatures] = useState<FeatureRecord[]>([]);
  const [featureId, setFeatureId] = useState("");
  const [rows, setRows] = useState<TestCaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState<TestCaseType | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TestCasePriority | "">("");
  const [automatableFilter, setAutomatableFilter] = useState("all");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(toEditorState());
  const [showFeatureForm, setShowFeatureForm] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState("");
  const [newFeatureDescription, setNewFeatureDescription] = useState("");
  const [newFeatureRoles, setNewFeatureRoles] = useState("admin, user");
  const [newFeaturePlatforms, setNewFeaturePlatforms] = useState("web");
  const [newFeatureBrowsers, setNewFeatureBrowsers] = useState("Chrome latest");
  const [newFeatureHasApi, setNewFeatureHasApi] = useState(true);
  const [disabledBundles, setDisabledBundles] = useState<TestCaseBundleKey[]>([]);

  const debouncedSearch = useDebouncedValue(searchInput, 200);

  const editorErrors = useMemo(() => validateEditor(editor), [editor]);
  const canSaveEditor = Object.keys(editorErrors).length === 0 && featureId.length > 0 && !saving;

  async function loadFeatures() {
    const list = await fetchFeatures();
    setFeatures(list);
    if (!featureId && list.length > 0) {
      setFeatureId(list[0].id);
    }
  }

  async function loadTestCases(selectedFeatureId: string) {
    if (!selectedFeatureId) {
      setRows([]);
      return;
    }
    const records = await fetchFeatureTestCases(selectedFeatureId, {
      type: typeFilter,
      priority: priorityFilter,
      isAutomatable: automatableFilter,
      q: debouncedSearch.trim()
    });
    setRows(records);
  }

  useEffect(() => {
    setLoading(true);
    loadFeatures()
      .catch(() => showToast({ variant: "error", title: "Failed to load features" }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!featureId) return;
    setLoading(true);
    loadTestCases(featureId)
      .catch(() => showToast({ variant: "error", title: "Failed to load test cases" }))
      .finally(() => setLoading(false));
  }, [featureId, typeFilter, priorityFilter, automatableFilter, debouncedSearch]);

  const selectedFeature = useMemo(() => features.find((item) => item.id === featureId) ?? null, [features, featureId]);

  const openCreate = () => {
    setEditor(toEditorState());
    setIsEditorOpen(true);
  };

  const openEdit = (row: TestCaseRecord) => {
    setEditor(toEditorState(row));
    setIsEditorOpen(true);
  };

  async function handleSaveTestCase() {
    if (!featureId || !canSaveEditor) return;
    setSaving(true);
    try {
      const payload = toCreateInput(featureId, editor);
      if (editor.id) {
        const { featureId: _featureId, ...updatePayload } = payload;
        await updateTestCase(editor.id, updatePayload);
        showToast({ variant: "success", title: "Test case updated" });
      } else {
        await createFeatureTestCase(featureId, payload);
        showToast({ variant: "success", title: "Test case created" });
      }
      setIsEditorOpen(false);
      await loadTestCases(featureId);
    } catch (error) {
      showToast({ variant: "error", title: "Failed to save test case", message: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTestCase(row: TestCaseRecord) {
    if (!window.confirm(`Delete test case \"${row.title}\"?`)) return;
    try {
      await deleteTestCase(row.id);
      showToast({ variant: "success", title: "Test case removed" });
      await loadTestCases(featureId);
    } catch (error) {
      showToast({ variant: "error", title: "Failed to delete test case", message: error instanceof Error ? error.message : undefined });
    }
  }

  async function handleCreateFeature() {
    if (!newFeatureName.trim()) {
      showToast({ variant: "error", title: "Feature name is required" });
      return;
    }
    try {
      const created = await createFeature({
        name: newFeatureName,
        description: newFeatureDescription,
        rolesInvolved: newFeatureRoles.split(",").map((item) => item.trim()).filter(Boolean),
        platforms: newFeaturePlatforms.split(",").map((item) => item.trim()).filter(Boolean),
        browsersOrDevices: newFeatureBrowsers.split(",").map((item) => item.trim()).filter(Boolean),
        hasApi: newFeatureHasApi
      });
      setFeatures((current) => [created, ...current]);
      setFeatureId(created.id);
      setShowFeatureForm(false);
      setNewFeatureName("");
      setNewFeatureDescription("");
      showToast({ variant: "success", title: "Feature created" });
    } catch (error) {
      showToast({ variant: "error", title: "Failed to create feature", message: error instanceof Error ? error.message : undefined });
    }
  }

  async function handleGenerate() {
    if (!featureId) return;
    setSaving(true);
    try {
      const payload = await generateFeatureTestCases(featureId, {
        persist: true,
        disableBundles: disabledBundles,
        userRolesInvolved: selectedFeature?.rolesInvolved,
        platforms: selectedFeature?.platforms,
        browsersOrDevices: selectedFeature?.browsersOrDevices,
        hasApi: selectedFeature?.hasApi
      });
      showToast({ variant: "success", title: `${payload.generated.length} baseline test cases generated` });
      await loadTestCases(featureId);
    } catch (error) {
      showToast({ variant: "error", title: "Failed to generate test cases", message: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell>
      <div className="flex min-h-full flex-1 flex-col bg-white p-4 shadow-[0_10px_20px_rgba(148,163,184,0.2)]">
        <main className="px-4 py-4 md:px-8 md:py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#0f172a]">QA Test Cases</h1>
            <p className="text-sm text-[#64748b]">Template-driven manual/automation-ready QA test case management per feature.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => downloadTestCasesCsv(`qa-test-cases-${Date.now()}.csv`, rows)}>
              Export CSV
            </Button>
            <Button variant="secondary" onClick={handleGenerate} state={saving ? "loading" : "default"}>
              Generate Baseline Test Cases
            </Button>
            <Button variant="primary" onClick={openCreate} disabled={!featureId}>
              Add Test Case
            </Button>
          </div>
        </div>

        <section className="mb-4 rounded-lg border border-[#dbe3ea] bg-white p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <FormSelectField
              label="Feature"
              value={featureId}
              onChange={(event) => setFeatureId(event.target.value)}
              options={[
                { label: "Select feature", value: "" },
                ...features.map((feature) => ({ label: feature.name, value: feature.id }))
              ]}
            />
            <div className="md:col-span-2 flex items-end gap-2">
              <Button variant="ghost" onClick={() => setShowFeatureForm((value) => !value)}>
                {showFeatureForm ? "Hide Feature Form" : "New Feature"}
              </Button>
            </div>
          </div>

          {showFeatureForm ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <FormInputField label="Feature Name" value={newFeatureName} onChange={setNewFeatureName} />
              <FormInputField label="Description" value={newFeatureDescription} onChange={setNewFeatureDescription} />
              <FormInputField label="Roles (comma-separated)" value={newFeatureRoles} onChange={setNewFeatureRoles} />
              <FormInputField label="Platforms (comma-separated)" value={newFeaturePlatforms} onChange={setNewFeaturePlatforms} />
              <FormInputField
                label="Browsers/Devices (comma-separated)"
                value={newFeatureBrowsers}
                onChange={setNewFeatureBrowsers}
              />
              <FormSelectField
                label="Has API"
                value={newFeatureHasApi ? "yes" : "no"}
                onChange={(event) => setNewFeatureHasApi(event.target.value === "yes")}
                options={[
                  { label: "Yes", value: "yes" },
                  { label: "No", value: "no" }
                ]}
              />
              <div className="md:col-span-2">
                <Button variant="primary" onClick={handleCreateFeature}>
                  Create Feature
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <FormInputField label="Search (title/tags)" value={searchInput} onChange={setSearchInput} />
            <FormSelectField
              label="Type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TestCaseType | "")}
              options={[{ label: "All", value: "" }, ...TEST_TYPES.map((type) => ({ label: type, value: type }))]}
            />
            <FormSelectField
              label="Priority"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as TestCasePriority | "")}
              options={[{ label: "All", value: "" }, ...TEST_PRIORITIES.map((value) => ({ label: value, value }))]}
            />
            <FormSelectField
              label="Automatable"
              value={automatableFilter}
              onChange={(event) => setAutomatableFilter(event.target.value)}
              options={[
                { label: "All", value: "all" },
                { label: "Yes", value: "true" },
                { label: "No", value: "false" }
              ]}
            />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#64748b]">Disable Generator Bundles</p>
            <div className="flex flex-wrap gap-3">
              {BUNDLES.map((bundle) => {
                const checked = disabledBundles.includes(bundle);
                return (
                  <label key={bundle} className="flex items-center gap-2 text-sm text-[#334155]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setDisabledBundles((current) =>
                          event.target.checked ? [...current, bundle] : current.filter((value) => value !== bundle)
                        );
                      }}
                    />
                    {bundle}
                  </label>
                );
              })}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[#dbe3ea] bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse text-sm">
              <thead className="bg-[#f8fafc] text-left text-[#334155]">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Automatable</th>
                  <th className="px-3 py-2">Tags</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-[#64748b]" colSpan={6}>
                      No test cases found.
                    </td>
                  </tr>
                ) : null}
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[#eef2f6]">
                    <td className="px-3 py-2 font-medium text-[#0f172a]">{row.title}</td>
                    <td className="px-3 py-2">{row.type}</td>
                    <td className="px-3 py-2">{row.priority}</td>
                    <td className="px-3 py-2">{row.isAutomatable ? "Yes" : "No"}</td>
                    <td className="px-3 py-2">{row.tags.join(", ")}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" tone="danger" onClick={() => handleDeleteTestCase(row)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        </main>
      </div>

      <ModalShell
        open={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editor.id ? "Edit Test Case" : "Add Test Case"}
        maxWidthClassName="max-w-4xl"
      >
        <div className="grid max-h-[75vh] gap-3 overflow-y-auto p-1 md:grid-cols-2">
          <FormInputField
            label="Title"
            value={editor.title}
            onChange={(value) => setEditor((state) => ({ ...state, title: value }))}
            error={editorErrors.title}
          />
          <FormSelectField
            label="Priority"
            value={editor.priority}
            onChange={(event) => setEditor((state) => ({ ...state, priority: event.target.value as TestCasePriority }))}
            error={editorErrors.priority}
            options={TEST_PRIORITIES.map((value) => ({ label: value, value }))}
          />
          <FormSelectField
            label="Type"
            value={editor.type}
            onChange={(event) => setEditor((state) => ({ ...state, type: event.target.value as TestCaseType }))}
            error={editorErrors.type}
            options={TEST_TYPES.map((value) => ({ label: value, value }))}
          />
          <FormSelectField
            label="Automatable"
            value={editor.isAutomatable ? "yes" : "no"}
            onChange={(event) => setEditor((state) => ({ ...state, isAutomatable: event.target.value === "yes" }))}
            options={[
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" }
            ]}
          />
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-text-primary">Preconditions</label>
            <textarea
              value={editor.preconditions}
              onChange={(event) => setEditor((state) => ({ ...state, preconditions: event.target.value }))}
              className="h-20 w-full rounded-md border border-border-default px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Steps (one per line)</label>
            <textarea
              value={editor.steps}
              onChange={(event) => setEditor((state) => ({ ...state, steps: event.target.value }))}
              className={`h-28 w-full rounded-md border px-3 py-2 text-sm ${editorErrors.steps ? "border-border-danger" : "border-border-default"}`}
            />
            {editorErrors.steps ? <p className="text-xs text-text-danger">{editorErrors.steps}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Expected Results (one per line)</label>
            <textarea
              value={editor.expectedResults}
              onChange={(event) => setEditor((state) => ({ ...state, expectedResults: event.target.value }))}
              className={`h-28 w-full rounded-md border px-3 py-2 text-sm ${editorErrors.expectedResults ? "border-border-danger" : "border-border-default"}`}
            />
            {editorErrors.expectedResults ? <p className="text-xs text-text-danger">{editorErrors.expectedResults}</p> : null}
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-text-primary">Test Data (JSON)</label>
            <textarea
              value={editor.testData}
              onChange={(event) => setEditor((state) => ({ ...state, testData: event.target.value }))}
              className={`h-24 w-full rounded-md border px-3 py-2 font-mono text-xs ${editorErrors.testData ? "border-border-danger" : "border-border-default"}`}
            />
            {editorErrors.testData ? <p className="text-xs text-text-danger">{editorErrors.testData}</p> : null}
          </div>
          <FormInputField
            label="Tags (comma-separated)"
            value={editor.tags}
            onChange={(value) => setEditor((state) => ({ ...state, tags: value }))}
          />
          <FormInputField
            label="Automation Notes"
            value={editor.automationNotes}
            onChange={(value) => setEditor((state) => ({ ...state, automationNotes: value }))}
          />
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-text-primary">Post Conditions</label>
            <textarea
              value={editor.postConditions}
              onChange={(event) => setEditor((state) => ({ ...state, postConditions: event.target.value }))}
              className="h-20 w-full rounded-md border border-border-default px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setIsEditorOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveTestCase} disabled={!canSaveEditor} state={saving ? "loading" : "default"}>
            Save
          </Button>
        </div>
      </ModalShell>
    </AdminShell>
  );
}
