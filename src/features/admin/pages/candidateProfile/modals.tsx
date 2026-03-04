import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../shared/components/Button";
import { FormInputField } from "../../../../shared/components/FormInputField";
import { ModalShell } from "../../../../shared/components/ModalShell";
import { ChevronDownIcon } from "../../../../shared/components/Icons";
import { isValidEmail, parsePositiveAmount } from "../../../../shared/lib/validation";
import type { CandidateRecord } from "../../data/candidatesDb";
import type { SkillCategoryRecord } from "../../data/skillsDb";
import { capabilityIdForEntry, normalizeLevelLabel, skillEntryKey } from "./utils";

const candidateAvatar = "https://www.figma.com/api/mcp/asset/1de7cd0b-8d22-4417-9f74-e989c00c5071";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
      <path d="M5 12.5L10 17.2L19 7.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProfileTextModal({
  open,
  title,
  label,
  value,
  onChange,
  onClose,
  onSave
}: {
  open: boolean;
  title: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const placeholder =
    label.toLowerCase().includes("about")
      ? "Write a short professional summary"
      : label.toLowerCase().includes("working as")
        ? "Describe role scope, impact, and years of experience"
        : "Enter details";

  return (
    <ModalShell open={open} title={title} onClose={onClose} maxWidthClassName="max-w-[600px]" showHeaderDivider={false}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium leading-5 text-[#070a13]">{label}</label>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={6}
            className="w-full rounded border border-[#d1d1d1] px-3 py-2 text-base leading-6 text-[#242424] outline-none"
            placeholder={placeholder}
          />
        </div>
        <div className="flex items-center gap-4">
          <Button variant="secondary" className="h-9 w-full" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="h-9 w-full" onClick={onSave}>Save</Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function VideoIntroModal({
  open,
  titleValue,
  urlValue,
  onChangeTitle,
  onChangeUrl,
  onClose,
  onSave
}: {
  open: boolean;
  titleValue: string;
  urlValue: string;
  onChangeTitle: (value: string) => void;
  onChangeUrl: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell open={open} title="Add Video Introduction" onClose={onClose} maxWidthClassName="max-w-[600px]" showHeaderDivider={false}>
      <div className="flex flex-col gap-4">
        <FormInputField label="Title" value={titleValue} onChange={onChangeTitle} placeholder="Video title" />
        <FormInputField label="Video URL" value={urlValue} onChange={onChangeUrl} placeholder="https://..." />
        <div className="flex items-center gap-4">
          <Button variant="secondary" className="h-9 w-full" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="h-9 w-full" onClick={onSave}>Save</Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function CoderbyteModal({
  open,
  scoreValue,
  linkValue,
  onChangeScore,
  onChangeLink,
  onClose,
  onSave
}: {
  open: boolean;
  scoreValue: string;
  linkValue: string;
  onChangeScore: (value: string) => void;
  onChangeLink: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell open={open} title="Add Coderbyte Results" onClose={onClose} maxWidthClassName="max-w-[600px]" showHeaderDivider={false}>
      <div className="flex flex-col gap-4">
        <FormInputField label="Score" value={scoreValue} onChange={onChangeScore} placeholder="e.g. 850/1000" />
        <FormInputField label="Result Link" value={linkValue} onChange={onChangeLink} placeholder="https://..." />
        <div className="flex items-center gap-4">
          <Button variant="secondary" className="h-9 w-full" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="h-9 w-full" onClick={onSave}>Save</Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function EducationModal({
  open,
  title = "Add Education",
  saveLabel = "Save",
  yearValue,
  degreeValue,
  schoolValue,
  onChangeYear,
  onChangeDegree,
  onChangeSchool,
  onClose,
  onSave
}: {
  open: boolean;
  title?: string;
  saveLabel?: string;
  yearValue: string;
  degreeValue: string;
  schoolValue: string;
  onChangeYear: (value: string) => void;
  onChangeDegree: (value: string) => void;
  onChangeSchool: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell open={open} title={title} onClose={onClose} maxWidthClassName="max-w-[600px]" showHeaderDivider={false}>
      <div className="flex flex-col gap-4">
        <FormInputField label="Year" value={yearValue} onChange={onChangeYear} placeholder="2026" />
        <FormInputField label="Degree" value={degreeValue} onChange={onChangeDegree} placeholder="Degree" />
        <FormInputField label="School" value={schoolValue} onChange={onChangeSchool} placeholder="School" />
        <div className="flex items-center gap-4">
          <Button variant="secondary" className="h-9 w-full" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="h-9 w-full" onClick={onSave}>{saveLabel}</Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function ProjectExperienceModal({
  open,
  title = "Add Project Experience",
  saveLabel = "Save",
  projectName,
  role,
  startDate,
  endDate,
  summary,
  responsibilities,
  technologies,
  onChangeProjectName,
  onChangeRole,
  onChangeStartDate,
  onChangeEndDate,
  onChangeSummary,
  onChangeResponsibilities,
  onChangeTechnologies,
  onClose,
  onSave
}: {
  open: boolean;
  title?: string;
  saveLabel?: string;
  projectName: string;
  role: string;
  startDate: string;
  endDate: string;
  summary: string;
  responsibilities: string;
  technologies: string;
  onChangeProjectName: (value: string) => void;
  onChangeRole: (value: string) => void;
  onChangeStartDate: (value: string) => void;
  onChangeEndDate: (value: string) => void;
  onChangeSummary: (value: string) => void;
  onChangeResponsibilities: (value: string) => void;
  onChangeTechnologies: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell open={open} title={title} onClose={onClose} maxWidthClassName="max-w-[600px]" bodyClassName="max-h-[85vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" showHeaderDivider={false}>
      <div className="flex flex-col gap-4">
        <FormInputField label="Project Name" value={projectName} onChange={onChangeProjectName} placeholder="Project name" />
        <div className="grid grid-cols-2 gap-4">
          <FormInputField label="Role" value={role} onChange={onChangeRole} placeholder="Role" />
          <div className="grid grid-cols-2 gap-3">
            <FormInputField label="Start Date" type="date" value={startDate} onChange={onChangeStartDate} />
            <FormInputField label="End Date" type="date" value={endDate} onChange={onChangeEndDate} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium leading-5 text-[#070a13]">About the Project</label>
          <textarea value={summary} onChange={(event) => onChangeSummary(event.target.value)} rows={4} className="w-full rounded border border-[#d1d1d1] px-3 py-2 text-base leading-6 text-[#242424] outline-none" placeholder="Project summary" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium leading-5 text-[#070a13]">Responsibilities</label>
          <textarea value={responsibilities} onChange={(event) => onChangeResponsibilities(event.target.value)} rows={4} className="w-full rounded border border-[#d1d1d1] px-3 py-2 text-base leading-6 text-[#242424] outline-none" placeholder="Responsibility line 1" />
        </div>
        <FormInputField label="Technologies (comma separated)" value={technologies} onChange={onChangeTechnologies} placeholder="React, TypeScript, Tailwind" />
        <div className="flex items-center gap-4">
          <Button variant="secondary" className="h-9 w-full" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="h-9 w-full" onClick={onSave}>{saveLabel}</Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function SkillsStepOneModal({
  open,
  categories,
  selectedCategoryId,
  onSelectCategory,
  onClose,
  onNext
}: {
  open: boolean;
  categories: SkillCategoryRecord[];
  selectedCategoryId: string;
  onSelectCategory: (value: string) => void;
  onClose: () => void;
  onNext: () => void;
}) {
  return (
    <ModalShell open={open} title="Add Skill" onClose={onClose} maxWidthClassName="max-w-[540px]" showHeaderDivider={false}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium leading-5 text-[#2c2c2c]">Select Skill Category</label>
          <select
            value={selectedCategoryId}
            onChange={(event) => onSelectCategory(event.target.value)}
            className="h-9 w-full rounded border border-[#d1d1d1] bg-white px-3 text-sm leading-5 text-[#344054] outline-none"
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="secondary" className="h-9 flex-1 text-sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="h-9 flex-1 text-sm" onClick={onNext} disabled={!selectedCategoryId}>Next</Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function SkillsStepTwoModal({
  open,
  category,
  selectedKeys,
  onToggle,
  onClose,
  onSave
}: {
  open: boolean;
  category: SkillCategoryRecord | null;
  selectedKeys: Set<string>;
  onToggle: (skillId: string, level: string, capabilityId: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell
      open={open}
      title="Add Skill"
      onClose={onClose}
      maxWidthClassName="max-w-[540px]"
      showHeaderDivider={false}
      bodyClassName="max-h-[78vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex flex-col gap-4">
        <div className="px-2">
          <p className="text-[20px] font-semibold leading-[30px] text-black">{category?.name ?? ""}</p>
        </div>
        <div className="max-h-[58vh] overflow-y-auto px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {category ? (
            <div className="space-y-4">
              {category.skills.map((skill) => (
                <div key={skill.id} className="overflow-hidden rounded border border-[#efefef] bg-white">
                  <div className="flex h-11 items-center gap-3 border-b border-[#eaecf0] bg-[#f4f8fa] px-6">
                    <p className="text-xs font-bold leading-[18px] text-[#2c2c2c]">{skill.name}</p>
                  </div>
                  <div className="space-y-0">
                    {skill.capabilities.map((group) => (
                      <div key={`${skill.id}-${group.level}`} className="border-b border-[#eaecf0] px-6 py-4 last:border-b-0">
                        <p className="mb-4 text-sm font-semibold leading-5 text-[#494949]">{normalizeLevelLabel(group.level)}</p>
                        <div className="space-y-4 pl-8">
                          {group.entries.map((text, index) => {
                            const capabilityId = capabilityIdForEntry(skill.id, group.level, index);
                            const key = skillEntryKey(skill.id, group.level, capabilityId);
                            const checked = selectedKeys.has(key);
                            return (
                              <button
                                key={key}
                                type="button"
                                role="checkbox"
                                aria-checked={checked}
                                aria-label={text}
                                onClick={() => onToggle(skill.id, group.level, capabilityId)}
                                className="flex items-start gap-2 text-left text-sm leading-5 text-[#344054]"
                              >
                                <span
                                  className={`mt-[2px] flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                    checked ? "border-[#00b2d5] bg-[#f9f5ff]" : "border-[#d0d5dd] bg-white"
                                  }`}
                                  aria-hidden
                                >
                                  {checked ? <CheckIcon /> : null}
                                </span>
                                <span>{text}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          <Button variant="secondary" className="h-9 flex-1 text-sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="h-9 flex-1 text-sm" onClick={onSave}>Save</Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function ConfirmDeleteModal({
  open,
  title,
  description,
  onCancel,
  onConfirm
}: {
  open: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell open={open} title={title} onClose={onCancel} maxWidthClassName="max-w-[520px]" showHeaderDivider={false}>
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-5 text-[#475467]">{description}</p>
        <div className="flex items-center gap-4">
          <Button variant="secondary" className="h-9 w-full" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" className="h-9 w-full bg-[#ef4444] hover:bg-[#dc2626]" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function ShareProfileModal({
  open,
  candidate,
  onClose,
  onShare
}: {
  open: boolean;
  candidate?: CandidateRecord;
  onClose: () => void;
  onShare: (payload: { name: string; email: string; expiration: string; rateLabel: string }) => void;
}) {
  const rateOptions = [
    { id: "adhoc-hourly", amount: "$10", label: "Ad Hoc - Hourly" },
    { id: "adhoc-daily", amount: "$80", label: "Ad Hoc - Daily" },
    { id: "adhoc-monthly", amount: "$1000", label: "Ad Hoc - Monthly" },
    { id: "salary-hourly", amount: "$10", label: "Hourly Salary" },
    { id: "daily-all-days", amount: "$80", label: "Daily - All Days" },
    { id: "daily-billable", amount: "$90", label: "Daily - Billable Days" },
    { id: "monthly", amount: "$1000", label: "Monthly" }
  ];
  const [selectedRate, setSelectedRate] = useState(rateOptions[0].id);
  const [customRate, setCustomRate] = useState("1,000.00");
  const [customRateUnit, setCustomRateUnit] = useState("Daily");
  const [expiration, setExpiration] = useState("");
  const [shareName, setShareName] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; expiration?: string; customRate?: string }>({});
  const minimumExpirationDate = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelectedRate(rateOptions[0].id);
    setCustomRate("1,000.00");
    setCustomRateUnit("Daily");
    setExpiration("");
    setShareName("");
    setShareEmail("");
    setErrors({});
  }, [open]);

  return (
    <ModalShell
      open={open}
      title="Share Profile"
      onClose={onClose}
      maxWidthClassName="max-w-[560px]"
      showHeaderDivider={false}
      bodyClassName="max-h-[88vh] overflow-y-auto"
    >
      <div className="flex flex-col gap-4">
        <div className="flex h-[60px] w-[320px] items-center gap-3 border-b border-[#eaecf0] px-3">
          <img src={candidateAvatar} alt={candidate?.name ?? "Candidate"} className="h-10 w-10 rounded-full object-cover" />
          <div className="text-sm leading-5">
            <p className="font-medium text-[#101828]">{candidate?.name ?? "Candidate Name"}</p>
            <p className="text-[#475467]">{candidate?.role ?? "Role"}</p>
          </div>
        </div>

        <div className="rounded-[4px] bg-[#e8f4fb] p-4">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-[16px] font-semibold leading-[24px] text-[#373737]">Rate to Client</p>
            <span className="text-xs text-[#797979]">|</span>
            <button type="button" className="flex items-center text-xs text-[#797979]">
              USD
            </button>
          </div>

          <div className="space-y-2">
            {rateOptions.map((option) => (
              <label key={option.id} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="share-rate"
                  checked={selectedRate === option.id}
                  onChange={() => setSelectedRate(option.id)}
                  className="h-4 w-4 accent-[#1595d4]"
                />
                <span className="w-[44px] text-sm font-semibold text-[#344054]">{option.amount}</span>
                <span className="text-sm font-medium text-[#344054]">-</span>
                <span className="text-sm text-[#475467]">{option.label}</span>
              </label>
            ))}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="share-rate"
                checked={selectedRate === "custom"}
                onChange={() => setSelectedRate("custom")}
                className="h-4 w-4 accent-[#1595d4]"
              />
              <div className="flex flex-1 items-center overflow-hidden rounded-[4px] border border-[#d1d1d1] bg-white">
                <div className="flex flex-1 items-center px-3 py-2 text-[#667085]">
                  <span className="mr-2">$</span>
                  <input
                    value={customRate}
                    onChange={(event) => {
                      setCustomRate(event.target.value);
                      setErrors((previous) => ({ ...previous, customRate: undefined }));
                    }}
                    placeholder="1,000.00"
                    className="w-full bg-transparent outline-none"
                  />
                </div>
                <div className="relative border-l border-[#d1d1d1]">
                  <select
                    value={customRateUnit}
                    onChange={(event) => setCustomRateUnit(event.target.value)}
                    className="h-10 appearance-none bg-white py-2 pl-3 pr-8 text-[#667085] outline-none"
                  >
                    <option>Daily</option>
                    <option>Hourly</option>
                    <option>Monthly</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
                </div>
              </div>
            </label>
            {errors.customRate ? <p className="text-xs text-[#f1080c]">{errors.customRate}</p> : null}
          </div>
        </div>

        <div>
          <FormInputField
            label="Link Expiration"
            type="date"
            value={expiration}
            min={minimumExpirationDate}
            error={errors.expiration}
            onChange={(value) => {
              setExpiration(value);
              setErrors((previous) => ({ ...previous, expiration: undefined }));
            }}
          />
        </div>

        <div>
          <p className="mb-2 text-[16px] font-semibold leading-6 text-[#494949]">Share With</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[16px] font-medium leading-6 text-[#494949]">Name</label>
              <input
                value={shareName}
                onChange={(event) => {
                  setShareName(event.target.value);
                  setErrors((previous) => ({ ...previous, name: undefined }));
                }}
                placeholder="Recipient name"
                className={`h-10 w-full rounded-[4px] border px-3 text-base text-[#242424] outline-none ${errors.name ? "border-[#f1080c]" : "border-[#d1d1d1]"}`}
              />
              {errors.name ? <p className="mt-1 text-xs text-[#f1080c]">{errors.name}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-[16px] font-medium leading-6 text-[#494949]">Email</label>
              <input
                type="email"
                value={shareEmail}
                onChange={(event) => {
                  setShareEmail(event.target.value);
                  setErrors((previous) => ({ ...previous, email: undefined }));
                }}
                placeholder="name@company.com"
                className={`h-10 w-full rounded-[4px] border px-3 text-base text-[#242424] outline-none ${errors.email ? "border-[#f1080c]" : "border-[#d1d1d1]"}`}
              />
              {errors.email ? <p className="mt-1 text-xs text-[#f1080c]">{errors.email}</p> : null}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pb-2 pt-1">
          <Button variant="secondary" className="h-9 flex-1 text-sm text-[#1595d4]" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="h-9 flex-1 text-sm"
            onClick={() => {
              const nextErrors: { name?: string; email?: string; expiration?: string; customRate?: string } = {};
              if (!shareName.trim()) {
                nextErrors.name = "Name is required.";
              }
              if (!shareEmail.trim()) {
                nextErrors.email = "Email is required.";
              } else if (!isValidEmail(shareEmail.trim())) {
                nextErrors.email = "Please enter a valid email address.";
              }
              if (!expiration) {
                nextErrors.expiration = "Expiration date is required.";
              } else {
                const today = new Date();
                const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
                const target = new Date(expiration);
                const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
                if (Number.isNaN(startTarget) || startTarget < startToday) {
                  nextErrors.expiration = "Expiration must be today or later.";
                }
              }
              if (selectedRate === "custom" && !parsePositiveAmount(customRate)) {
                nextErrors.customRate = "Enter a valid rate amount greater than 0.";
              }
              if (Object.keys(nextErrors).length > 0) {
                setErrors(nextErrors);
                return;
              }

              const selectedPreset = rateOptions.find((item) => item.id === selectedRate);
              const resolvedRateLabel =
                selectedRate === "custom"
                  ? `$${customRate} - ${customRateUnit}`
                  : selectedPreset
                    ? `${selectedPreset.amount} - ${selectedPreset.label}`
                    : "";
              onShare({
                name: shareName.trim(),
                email: shareEmail.trim(),
                expiration: expiration.trim(),
                rateLabel: resolvedRateLabel
              });
            }}
          >
            Share
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
