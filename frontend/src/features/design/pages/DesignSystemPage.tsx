import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import tokens from "../../../app/design-tokens.json";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { FormInputField } from "../../../shared/components/FormInputField";
import { DataTable } from "../../../shared/components/Table";
import { APP_ROUTES } from "../../../shared/config/routes";
import { useThemePreference } from "../../../shared/hooks/useThemePreference";
import { Inline } from "../../../shared/components/layout/Inline";
import { Stack } from "../../../shared/components/layout/Stack";

type ComponentMetaProp = {
  name: string;
  type: string;
  description: string;
  required?: boolean;
};

type ComponentDesignMeta = {
  name: string;
  description: string;
  whenToUse?: string;
  variants: string[];
  usage: string;
  props: ComponentMetaProp[];
};

type SidebarGroup = {
  id: string;
  title: string;
  items: { id: string; label: string }[];
};

type MetaModule = {
  default?: ComponentDesignMeta;
  designMeta?: ComponentDesignMeta;
};

const discoveredMetaModules = import.meta.glob<MetaModule>("../../../components/**/design.meta.{ts,tsx}", { eager: true });

function toSectionId(label: string) {
  return `component-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function CodeSnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Button variant="secondary" size="sm" onClick={onCopy}>{copied ? "Copied" : "Copy"}</Button>
      </div>
      <pre className="overflow-x-auto rounded-md border border-border-subtle bg-surface-muted p-3 text-xs text-text-secondary">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      {description ? <p className="mt-1 text-sm text-text-muted">{description}</p> : null}
    </div>
  );
}

function Swatch({ name, cssVar }: { name: string; cssVar: string }) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface-default p-3">
      <div className="h-14 rounded-sm border border-border-subtle" style={{ background: `rgb(var(${cssVar}))` }} />
      <p className="mt-2 text-sm font-medium text-text-primary">{name}</p>
      <p className="text-xs text-text-muted">{`rgb(var(${cssVar}))`}</p>
    </div>
  );
}

function ComponentDocSection({
  id,
  name,
  description,
  whenToUse,
  variants,
  usage,
  props
}: {
  id: string;
  name: string;
  description: string;
  whenToUse?: string;
  variants: string[];
  usage: string;
  props: ComponentMetaProp[];
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-md border border-border-subtle bg-surface-default p-4">
      <SectionTitle title={name} description={description} />
      {whenToUse ? <p className="mt-2 text-sm text-text-secondary"><span className="font-semibold">When to use:</span> {whenToUse}</p> : null}

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-text-primary">Variants</h3>
        <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-3">
          {variants.map((variant) => (
            <div key={variant} className="rounded-sm border border-border-subtle bg-surface-muted px-3 py-2 text-sm text-text-secondary">
              {variant}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold text-text-primary">Props</h3>
        <div className="overflow-hidden rounded-sm border border-border-subtle">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-muted">
                <th className="px-3 py-2 text-left text-xs font-semibold text-text-primary">Prop</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-text-primary">Type</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-text-primary">Description</th>
              </tr>
            </thead>
            <tbody>
              {props.map((prop) => (
                <tr key={`${id}-${prop.name}`} className="border-t border-border-subtle">
                  <td className="px-3 py-2 text-xs text-text-primary">{prop.name}{prop.required ? " *" : ""}</td>
                  <td className="px-3 py-2 text-xs text-text-secondary">{prop.type}</td>
                  <td className="px-3 py-2 text-xs text-text-secondary">{prop.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold text-text-primary">Usage</h3>
        <CodeSnippet code={usage} />
      </div>
    </section>
  );
}

export function DesignSystemPage() {
  const { theme, toggleTheme } = useThemePreference();
  const [query, setQuery] = useState("");
  const [activeSectionId, setActiveSectionId] = useState("colors");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ foundations: false, components: false });

  const discoveredComponentDocs = useMemo(() => {
    return Object.entries(discoveredMetaModules)
      .map(([path, module]) => {
        const meta = module.default ?? module.designMeta;
        if (!meta) return null;
        return {
          id: toSectionId(meta.name),
          path,
          ...meta
        };
      })
      .filter((entry): entry is ComponentDesignMeta & { id: string; path: string } => entry !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const baseSidebarGroups = useMemo<SidebarGroup[]>(() => {
    const componentItems = [
      { id: "button", label: "Button" },
      { id: "input", label: "Input" },
      { id: "card", label: "Card" },
      { id: "table", label: "Table" },
      { id: "layout", label: "Layout" },
      ...discoveredComponentDocs.map((meta) => ({ id: meta.id, label: meta.name }))
    ];

    return [
      {
        id: "foundations",
        title: "Foundations",
        items: [
          { id: "colors", label: "Colors" },
          { id: "typography", label: "Typography" },
          { id: "spacing", label: "Spacing" },
          { id: "radius", label: "Radius" },
          { id: "shadows", label: "Shadows" }
        ]
      },
      {
        id: "components",
        title: "Components",
        items: componentItems
      }
    ];
  }, [discoveredComponentDocs]);

  const q = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!q) return baseSidebarGroups;
    return baseSidebarGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(q) || item.id.includes(q) || group.title.toLowerCase().includes(q))
      }))
      .filter((group) => group.items.length > 0);
  }, [baseSidebarGroups, q]);

  const showSection = (id: string, label: string) => !q || id.includes(q) || label.toLowerCase().includes(q);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main section[id]"));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveSectionId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-96px 0px -55% 0px",
        threshold: [0.15, 0.35, 0.6]
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [q, discoveredComponentDocs.length]);

  const tableColumns = useMemo(
    () => [
      { key: "name", label: "Name", render: (row: { name: string }) => row.name },
      { key: "email", label: "Email", render: (row: { email: string }) => row.email },
      { key: "plan", label: "Plan", render: (row: { plan: string }) => row.plan },
      { key: "status", label: "Status", render: (row: { status: string }) => row.status }
    ],
    []
  );

  const tableRows = [
    { name: "Alex Morgan", email: "alex@client.com", plan: "Pro", status: "Active" },
    { name: "Jordan Lee", email: "jordan@client.com", plan: "Business", status: "Pending" }
  ];

  return (
    <div className="min-h-screen bg-surface-app p-6 text-text-primary">
      <Inline align="between" className="sticky top-4 z-20 mb-4 rounded-md border border-border-subtle bg-surface-default p-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold">Design System</h1>
          <p className="text-sm text-text-muted">Tokenized foundations and live component variants</p>
        </div>
        <Inline>
          <Link to={APP_ROUTES.admin.settings}>
            <Button variant="ghost" size="sm">Settings</Button>
          </Link>
          <Button variant="secondary" onClick={toggleTheme}>Theme: {theme}</Button>
        </Inline>
      </Inline>

      <div className="grid grid-cols-[280px_1fr] gap-4">
        <aside className="sticky top-24 h-[calc(100vh-8rem)] self-start overflow-y-auto rounded-md border border-border-subtle bg-surface-default p-4">
          <FormInputField label="Search" value={query} onChange={setQuery} placeholder="Search tokens or components" />
          <Stack className="mt-4" gap="4">
            {filteredGroups.map((group) => (
              <div key={group.id}>
                <button
                  type="button"
                  className="mb-2 inline-flex w-full items-center justify-between text-left text-sm font-semibold text-text-primary"
                  onClick={() => setCollapsed((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                >
                  <span>{group.title}</span>
                  <span className="text-text-muted">{collapsed[group.id] ? "+" : "-"}</span>
                </button>
                {!collapsed[group.id] ? (
                  <Stack gap="2">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => scrollToSection(item.id)}
                        className={`rounded-sm px-2 py-1 text-left text-sm ${activeSectionId === item.id ? "bg-action-secondary text-action-primary" : "text-text-secondary hover:bg-surface-muted"}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </Stack>
                ) : null}
              </div>
            ))}
          </Stack>
        </aside>

        <main className="space-y-6">
          {showSection("colors", "Colors") ? (
            <section id="colors" className="scroll-mt-24 rounded-md border border-border-subtle bg-surface-default p-4">
              <SectionTitle title="Colors" description="Semantic color tokens mapped from inferred UI usage." />
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Swatch name="bg.canvas" cssVar="--ds-semantic-bg-canvas" />
                <Swatch name="bg.surface" cssVar="--ds-semantic-bg-surface" />
                <Swatch name="action.primary" cssVar="--ds-semantic-action-primary" />
                <Swatch name="text.primary" cssVar="--ds-semantic-text-primary" />
                <Swatch name="text.muted" cssVar="--ds-semantic-text-muted" />
                <Swatch name="border.default" cssVar="--ds-semantic-border-default" />
                <Swatch name="status.success" cssVar="--ds-semantic-status-success" />
                <Swatch name="status.danger" cssVar="--ds-semantic-status-danger" />
              </div>
            </section>
          ) : null}

          {showSection("typography", "Typography") ? (
            <section id="typography" className="scroll-mt-24 rounded-md border border-border-subtle bg-surface-default p-4">
              <SectionTitle title="Typography" description="Poppins scale extracted from recurring text classes." />
              <Stack className="mt-4" gap="2">
                <p className="text-xs">Text xs - {tokens.core.typography.size.xs}</p>
                <p className="text-sm">Text sm - {tokens.core.typography.size.sm}</p>
                <p className="text-base">Text base - {tokens.core.typography.size.base}</p>
                <p className="text-lg">Text lg - {tokens.core.typography.size.lg}</p>
                <p className="text-xl font-semibold">Text xl semibold</p>
                <p className="text-2xl font-semibold">Text 2xl semibold</p>
              </Stack>
            </section>
          ) : null}

          {showSection("spacing", "Spacing") ? (
            <section id="spacing" className="scroll-mt-24 rounded-md border border-border-subtle bg-surface-default p-4">
              <SectionTitle title="Spacing" description="Core spacing scale." />
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Object.entries(tokens.core.space).map(([key, value]) => (
                  <div key={key} className="rounded-sm border border-border-subtle bg-surface-muted p-3">
                    <p className="text-sm font-medium">space-{key}</p>
                    <p className="text-xs text-text-muted">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {showSection("radius", "Radius") ? (
            <section id="radius" className="scroll-mt-24 rounded-md border border-border-subtle bg-surface-default p-4">
              <SectionTitle title="Radius" />
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
                {Object.entries(tokens.core.radius).map(([key, value]) => (
                  <div key={key} className="rounded-sm border border-border-subtle bg-surface-muted p-3">
                    <div className="h-10 border border-border-default bg-surface-default" style={{ borderRadius: value }} />
                    <p className="mt-2 text-sm font-medium">radius-{key}</p>
                    <p className="text-xs text-text-muted">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {showSection("shadows", "Shadows") ? (
            <section id="shadows" className="scroll-mt-24 rounded-md border border-border-subtle bg-surface-default p-4">
              <SectionTitle title="Shadows" />
              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="rounded-md border border-border-subtle bg-surface-default p-4 shadow-sm">shadow-sm</div>
                <div className="rounded-md border border-border-subtle bg-surface-default p-4 shadow-md">shadow-md</div>
                <div className="rounded-md border border-border-subtle bg-surface-default p-4 shadow-lg">shadow-lg</div>
              </div>
            </section>
          ) : null}

          {showSection("button", "Button") ? (
            <section id="button" className="scroll-mt-24 rounded-md border border-border-subtle bg-surface-default p-4">
              <SectionTitle title="Button" description="size + style + tone + state" />
              <p className="mt-2 text-sm text-text-secondary"><span className="font-semibold">When to use:</span> Trigger actions in forms, toolbars, and dialogs with clear hierarchy.</p>
              <Stack className="mt-4" gap="4">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-text-primary">Variant grid</h3>
                  <Inline gap="2" className="flex-wrap">
                    <Button variant="primary" size="sm">Primary sm</Button>
                    <Button variant="primary">Primary md</Button>
                    <Button variant="primary" size="lg">Primary lg</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="primary" tone="danger">Danger</Button>
                    <Button variant="primary" state="loading">Loading</Button>
                    <Button variant="primary" state="disabled">Disabled</Button>
                  </Inline>
                </div>
                <Card title="Props">
                  <p className="text-sm text-text-secondary">variant: primary|secondary|ghost|icon</p>
                  <p className="text-sm text-text-secondary">size: sm|md|lg</p>
                  <p className="text-sm text-text-secondary">tone: default|danger</p>
                  <p className="text-sm text-text-secondary">state: default|disabled|loading</p>
                </Card>
                <CodeSnippet code={`<Button variant=\"primary\" size=\"md\" tone=\"default\">Save</Button>`} />
              </Stack>
            </section>
          ) : null}

          {showSection("input", "Input") ? (
            <section id="input" className="scroll-mt-24 rounded-md border border-border-subtle bg-surface-default p-4">
              <SectionTitle title="Input" description="size + state" />
              <p className="mt-2 text-sm text-text-secondary"><span className="font-semibold">When to use:</span> Collect short user input with clear labels and validation feedback.</p>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <FormInputField label="Default" value="" onChange={() => undefined} placeholder="Placeholder" />
                <FormInputField label="Error" value="Invalid value" onChange={() => undefined} error="Invalid input" />
                <FormInputField label="Small" value="" size="sm" onChange={() => undefined} />
                <FormInputField label="Disabled" value="Disabled" state="disabled" onChange={() => undefined} />
              </div>
              <div className="mt-4">
                <Card title="Props">
                  <p className="text-sm text-text-secondary">size: sm|md|lg</p>
                  <p className="text-sm text-text-secondary">state: default|error|disabled</p>
                </Card>
                <div className="mt-3">
                  <CodeSnippet code={`<FormInputField label=\"Email\" size=\"md\" state=\"default\" value={email} onChange={setEmail} />`} />
                </div>
              </div>
            </section>
          ) : null}

          {showSection("card", "Card") ? (
            <section id="card" className="scroll-mt-24 rounded-md border border-border-subtle bg-surface-default p-4">
              <SectionTitle title="Card" />
              <p className="mt-2 text-sm text-text-secondary"><span className="font-semibold">When to use:</span> Group related content into scannable sections with optional title/subtitle.</p>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card title="Card title" subtitle="Optional subtitle">Basic content area</Card>
                <Card title="Metric">
                  <p className="text-2xl font-semibold text-text-primary">62</p>
                  <p className="text-sm text-text-muted">Total candidates</p>
                </Card>
              </div>
              <div className="mt-3">
                <CodeSnippet code={`<Card title=\"Metric\"><p className=\"text-2xl font-semibold\">62</p></Card>`} />
              </div>
            </section>
          ) : null}

          {showSection("table", "Table") ? (
            <section id="table" className="scroll-mt-24 rounded-md border border-border-subtle bg-surface-default p-4">
              <SectionTitle title="Table" />
              <p className="mt-2 text-sm text-text-secondary"><span className="font-semibold">When to use:</span> Display structured record lists with consistent columns and sortable headers.</p>
              <div className="mt-4">
                <DataTable columns={tableColumns} rows={tableRows} rowKey={(row) => row.email} />
              </div>
              <div className="mt-3">
                <CodeSnippet code={`<DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />`} />
              </div>
            </section>
          ) : null}

          {showSection("layout", "Layout") ? (
            <section id="layout" className="scroll-mt-24 rounded-md border border-border-subtle bg-surface-default p-4">
              <SectionTitle title="Layout" description="Stack and Inline primitives" />
              <p className="mt-2 text-sm text-text-secondary"><span className="font-semibold">When to use:</span> Compose page sections with consistent spacing and horizontal alignment patterns.</p>
              <Stack className="mt-4" gap="3">
                <Card title="Stack example">
                  <Stack gap="2">
                    <div className="rounded-sm bg-surface-muted p-2 text-sm">Row A</div>
                    <div className="rounded-sm bg-surface-muted p-2 text-sm">Row B</div>
                  </Stack>
                </Card>
                <Card title="Inline example">
                  <Inline gap="2" align="between">
                    <div className="rounded-sm bg-surface-muted p-2 text-sm">Left</div>
                    <div className="rounded-sm bg-surface-muted p-2 text-sm">Right</div>
                  </Inline>
                </Card>
              </Stack>
              <div className="mt-3">
                <CodeSnippet code={`<Stack gap=\"4\">...</Stack>\n<Inline gap=\"3\" align=\"between\">...</Inline>`} />
              </div>
            </section>
          ) : null}

          {discoveredComponentDocs
            .filter((meta) => showSection(meta.id, meta.name))
            .map((meta) => (
              <ComponentDocSection
                key={meta.id}
                id={meta.id}
                name={meta.name}
                description={meta.description}
                whenToUse={meta.whenToUse}
                variants={meta.variants}
                usage={meta.usage}
                props={meta.props}
              />
            ))}
        </main>
      </div>
    </div>
  );
}
