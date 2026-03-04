import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminShell } from "../layout/AdminShell";
import { Button } from "../../../shared/components/Button";
import { useToast } from "../../../shared/components/ToastProvider";
import {
  CandidateProfileSkillSelection,
  CandidateRecord,
  fetchCandidateById,
  fetchPublicCandidateByShareToken,
  getCandidateById,
  getCandidates,
  updateCandidate
} from "../data/candidatesDb";
import { SkillsState, fetchSkillsState, getSkillsState } from "../data/skillsDb";
import {
  addSharedProfile,
  fetchSharedProfiles,
  fetchSharedProfileByToken,
  getSharedProfilePublicUrl,
  SharedProfileRecord
} from "../data/sharedProfilesDb";
import { APP_ROUTES } from "../../../shared/config/routes";
import { useUnsavedChangesGuard } from "../../../shared/hooks/useUnsavedChangesGuard";
import {
  formatProjectDurationRange,
  parseProjectDurationRange,
  skillEntryKey,
  toPolarPoint,
  truncateRadarLabel
} from "./candidateProfile/utils";
import {
  emptyProfileContent,
  getCandidateProfileContent,
  getRadarMetrics,
  getRelevantSkillTracks,
  getTrackFromSelection,
  hasCoreProfileData,
  keysToSkillSelectionItems
} from "./candidateProfile/domain";
import { useCandidateProfileEditorState } from "./candidateProfile/useCandidateProfileEditorState";
import type { CandidateProfileContent, CandidateProject, RadarMetric, SkillCategory, SkillTrackItem } from "./candidateProfile/types";
import { CandidateProfileEmptySections, CandidateProfileFilledSections } from "./candidateProfile/sections";
import {
  CoderbyteModal,
  ConfirmDeleteModal,
  EducationModal,
  ProfileTextModal,
  ProjectExperienceModal,
  ShareProfileModal,
  SkillsStepOneModal,
  SkillsStepTwoModal,
  VideoIntroModal
} from "./candidateProfile/modals";

type NavItem = {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
};

const STATIC_NAV_ITEMS: NavItem[] = [
  { id: "about", label: "About" },
  { id: "designer-experience", label: "Experience" },
  { id: "coderbyte", label: "Coderbyte" },
  { id: "education", label: "Education" }
];

const brandLogo = "https://www.figma.com/api/mcp/asset/18a2c059-6d4d-42f8-a8b2-1256d07938c5";
const clientAvatar = "https://www.figma.com/api/mcp/asset/230ccce5-50d8-487a-82e3-1c15832044bc";
const candidateAvatar = "https://www.figma.com/api/mcp/asset/1de7cd0b-8d22-4417-9f74-e989c00c5071";
const backIconAsset = "https://www.figma.com/api/mcp/asset/2f5b7717-cd66-4014-90f0-3a07fe71099e";
const locationIconAsset = "https://www.figma.com/api/mcp/asset/15f55cd8-a4df-45eb-9daa-fbe9c38bb8ea";

function ArrowBackIcon() {
  return (
    <img src={backIconAsset} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
  );
}

function LocationIcon() {
  return (
    <img src={locationIconAsset} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" aria-hidden="true">
      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" aria-hidden="true">
      <path d="M4 20H8L18 10L14 6L4 16V20Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12.5 7.5L16.5 11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" aria-hidden="true">
      <path d="M5 7H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 7V5H15V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 7L9 19H15L16 7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="#5e6e79" />
      <path d="M27 22L43 32L27 42V22Z" fill="#e7edf2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" aria-hidden="true">
      <path d="M3.5 8.4L6.6 11.4L12.5 4.8" stroke="#00b2d5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" aria-hidden="true">
      <path d="M7 14L12 9L17 14" stroke="#1595d4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Tag({ children }: { children: string }) {
  return (
    <span className="rounded-2xl bg-[#efefef] px-2 py-[2px] text-xs font-medium leading-[18px] text-[#4f4f4f]">{children}</span>
  );
}

function SectionHeading({
  id,
  title,
  withAdd = false,
  onAdd,
  actionType
}: {
  id: string;
  title: string;
  withAdd?: boolean;
  onAdd?: () => void;
  actionType?: "plus" | "edit";
}) {
  const shouldShowPlus = actionType ? actionType === "plus" : withAdd;
  const shouldShowAction = Boolean(onAdd) && (actionType ? true : withAdd);
  return (
    <div id={id} className="scroll-mt-8 border-l-4 border-[#1595d4] pl-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase leading-5 text-[#494949]">{title}</h3>
        {shouldShowAction ? (
          <button type="button" className="text-[#1595d4]" aria-label={`${title} action`} onClick={onAdd}>
            {shouldShowPlus ? <PlusIcon /> : <EditIcon />}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PlaceholderSectionRow({
  id,
  title,
  onAdd,
  children,
  actionType = "plus"
}: {
  id: string;
  title: string;
  onAdd?: () => void;
  children?: ReactNode;
  actionType?: "plus" | "edit";
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="border-l-4 border-[#1595d4] pl-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold leading-5 text-[#494949]">{title}</h3>
          {onAdd ? (
            <button type="button" className="text-[#1595d4]" aria-label={`Add ${title}`} onClick={onAdd}>
              {actionType === "plus" ? <PlusIcon /> : <EditIcon />}
            </button>
          ) : null}
        </div>
      </div>
      {children ? <div className="mt-2 pl-2 text-sm leading-5 text-[#494949]">{children}</div> : null}
    </section>
  );
}

function SkillLine({ text, checked }: { text: string; checked: boolean }) {
  return (
    <div className="flex items-start gap-2 text-sm leading-5 text-[#344054]">
      <span className={`mt-[2px] flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-[#00b2d5]" : "border-[#d0d5dd]"}`}>
        {checked ? <CheckIcon /> : null}
      </span>
      <p>{text}</p>
    </div>
  );
}

function SkillLineCheckbox({
  text,
  checked,
  onToggle
}: {
  text: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={text}
      onClick={() => onToggle(!checked)}
      className="flex cursor-pointer items-start gap-2 text-left text-sm leading-5 text-[#344054]"
    >
      <span
        className={`mt-[2px] flex h-4 w-4 items-center justify-center rounded border ${
          checked ? "border-[#00b2d5] bg-[#00b2d5]" : "border-[#d0d5dd] bg-white"
        }`}
        aria-hidden
      >
        {checked ? <CheckIcon /> : null}
      </span>
      <span>{text}</span>
    </button>
  );
}

function SkillCategoryCard({
  category,
  onToggle
}: {
  category: SkillCategory;
  onToggle?: (skillId: string, level: string, capabilityId: string, checked: boolean) => void;
}) {
  return (
    <article className="overflow-hidden rounded border border-[#efefef] bg-white">
      <div className="flex h-11 items-center gap-3 border-b border-[#eaecf0] bg-[#f4f8fa] px-6 py-3">
        <p className="text-xs font-bold leading-[18px] text-[#2c2c2c]">{category.title}</p>
        <span className="rounded-2xl bg-[#ecfdf3] px-2 py-[2px] text-xs font-medium leading-[18px] text-[#027a48]">{category.tag}</span>
      </div>

      {category.levels.map((level, index) => (
        <div key={`${category.title}-${index}`} className="border-b border-[#eaecf0] px-6 py-4 last:border-b-0">
          {level.label ? <p className="mb-4 text-sm font-semibold leading-5 text-[#494949]">{level.label}</p> : null}
          <div className="space-y-3 pl-8">
            {level.items.map((item) => (
              onToggle && item.skillId && item.level && item.capabilityId ? (
                <SkillLineCheckbox
                  key={`${level.label}-${item.text}`}
                  text={item.text}
                  checked={item.checked}
                  onToggle={(checked) => onToggle(item.skillId!, item.level!, item.capabilityId!, checked)}
                />
              ) : (
                <SkillLine key={`${level.label}-${item.text}`} text={item.text} checked={item.checked} />
              )
            ))}
          </div>
        </div>
      ))}
    </article>
  );
}

type CandidateEducation = {
  year: string;
  degree: string;
  school: string;
};

const candidateProfileContentById: Record<string, CandidateProfileContent> = {};

function SkillsRadarChart({ metrics }: { metrics: RadarMetric[] }) {
  if (metrics.length === 0) {
    return (
      <div className="w-[598px] max-w-full px-4 py-8 text-center text-sm text-[#667085]">
        No skill data yet.
      </div>
    );
  }

  const width = 598;
  const height = 360;
  const cx = width / 2;
  const cy = 170;
  const radius = 130;
  const rings = 4;
  const axisCount = metrics.length;
  const angleStep = (Math.PI * 2) / axisCount;
  const startAngle = -Math.PI / 2;

  const axisPoints = metrics.map((_, index) => {
    const angle = startAngle + index * angleStep;
    return {
      angle,
      outer: toPolarPoint(cx, cy, radius, angle),
      label: toPolarPoint(cx, cy, radius + 30, angle)
    };
  });

  const dataPoints = metrics.map((metric, index) => {
    const angle = startAngle + index * angleStep;
    const valueRadius = (Math.max(0, Math.min(100, metric.value)) / 100) * radius;
    return toPolarPoint(cx, cy, valueRadius, angle);
  });

  const dataPolygon = dataPoints.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="w-[598px] max-w-full px-4 py-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Candidate skills radar chart">
        {Array.from({ length: rings }, (_, ringIndex) => {
          const r = ((ringIndex + 1) / rings) * radius;
          const ringPoints = axisPoints.map((axis) => toPolarPoint(cx, cy, r, axis.angle));
          return (
            <polygon
              key={`ring-${ringIndex}`}
              points={ringPoints.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke="#d1d9e0"
              strokeWidth="1"
            />
          );
        })}

        {axisPoints.map((axis, index) => (
          <line
            key={`axis-${metrics[index].label}`}
            x1={cx}
            y1={cy}
            x2={axis.outer.x}
            y2={axis.outer.y}
            stroke="#d1d9e0"
            strokeWidth="1"
          />
        ))}

        <polygon points={dataPolygon} fill="rgba(21,149,212,0.22)" stroke="#1595d4" strokeWidth="2" />

        {dataPoints.map((point, index) => (
          <circle key={`point-${metrics[index].label}`} cx={point.x} cy={point.y} r="3.5" fill="#1595d4" />
        ))}

        {axisPoints.map((axis, index) => (
          <text
            key={`label-${metrics[index].label}`}
            x={axis.label.x}
            y={axis.label.y}
            textAnchor={axis.label.x < cx - 8 ? "end" : axis.label.x > cx + 8 ? "start" : "middle"}
            className="fill-[#475467] text-[11px] font-medium"
          >
            {truncateRadarLabel(metrics[index].label)}
          </text>
        ))}

      </svg>
    </div>
  );
}

function SkillTrack({
  id,
  title,
  categories,
  onToggle
}: {
  id: string;
  title: string;
  categories: SkillCategory[];
  onToggle?: (skillId: string, level: string, capabilityId: string, checked: boolean) => void;
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="mb-4 flex items-center justify-between pr-4">
        <div className="flex items-center gap-2 px-2">
          <h4 className="text-[20px] font-semibold leading-[30px] text-black">{title}</h4>
          {onToggle ? (
            <button type="button" className="text-[#1595d4]" aria-label={`Edit ${title}`}>
              <EditIcon />
            </button>
          ) : null}
        </div>
        <button type="button" aria-label={`Collapse ${title}`} className="text-[#1595d4]">
          <ArrowUpIcon />
        </button>
      </div>

      <div className="space-y-4 px-2">
        {categories.map((category) => (
          <SkillCategoryCard key={`${title}-${category.title}`} category={category} onToggle={onToggle} />
        ))}
      </div>
    </section>
  );
}

function CandidateProjectCard({
  id,
  project,
  onEdit,
  onDelete
}: {
  id: string;
  project: CandidateProject;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <article id={id} className="scroll-mt-8 rounded-lg border-2 border-[#eaeaea] bg-[#f8f8f8] px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-semibold leading-7 text-[#494949]">{project.name}</h4>
            {onEdit ? (
              <button type="button" className="text-[#1595d4]" aria-label="Edit project" onClick={onEdit}>
                <EditIcon />
              </button>
            ) : null}
            {onDelete ? (
              <button type="button" className="text-[#1595d4]" aria-label="Delete project" onClick={onDelete}>
                <DeleteIcon />
              </button>
            ) : null}
          </div>
          <p className="text-xs leading-[18px] text-[#969696]">{project.role}</p>
        </div>
        <p className="text-sm leading-5 text-[#494949]">{project.duration}</p>
      </div>

      <div className="mt-4 space-y-4 text-sm leading-5 text-[#494949]">
        <div>
          <p className="font-semibold">About the Project</p>
          <p className="mt-2">{project.summary}</p>
        </div>

        <div>
          <p className="font-semibold">Role and Responsibilities</p>
          <ul className="mt-2 list-disc pl-6 text-[#475467]">
            {project.responsibilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-medium">Technologies:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {project.technologies.map((tech) => (
              <Tag key={tech}>{tech}</Tag>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export function CandidateProfilePage() {
  const navigate = useNavigate();
  const { candidateId, shareToken } = useParams();
  const isSharedView = Boolean(shareToken);
  const resolvedCandidateId = candidateId ?? "dianne";
  const [activeNav, setActiveNav] = useState("about");
  const [candidate, setCandidate] = useState<CandidateRecord | undefined>(() =>
    isSharedView ? undefined : (getCandidateById(resolvedCandidateId) ?? getCandidates()[0])
  );
  const [sharedRecipient, setSharedRecipient] = useState<Pick<SharedProfileRecord, "sharedWithName" | "sharedWithEmail"> | null>(null);
  const [adminSharedRecipient, setAdminSharedRecipient] = useState<Pick<SharedProfileRecord, "sharedWithName" | "sharedWithEmail"> | null>(null);
  const [isShareLinkInvalid, setIsShareLinkInvalid] = useState(false);
  const [isShareLinkLoading, setIsShareLinkLoading] = useState(isSharedView);
  const [skillsState, setSkillsState] = useState<SkillsState>(() => getSkillsState());
  const { showToast } = useToast();
  const skillsSaveTimerRef = useRef<number | null>(null);
  const pendingSkillSelectionsRef = useRef<CandidateProfileSkillSelection[] | null>(null);
  const isFlushingSkillsSaveRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    if (isSharedView) {
      setIsShareLinkLoading(true);
      setIsShareLinkInvalid(false);
      Promise.all([
        fetchPublicCandidateByShareToken(shareToken ?? ""),
        fetchSharedProfileByToken(shareToken ?? "")
      ]).then(([record, sharedRecord]) => {
        if (!mounted) return;
        if (!record || !sharedRecord) {
          setCandidate(undefined);
          setSharedRecipient(null);
          setAdminSharedRecipient(null);
          setIsShareLinkInvalid(true);
          setIsShareLinkLoading(false);
          return;
        }
        setCandidate(record);
        setSharedRecipient({
          sharedWithName: sharedRecord.sharedWithName,
          sharedWithEmail: sharedRecord.sharedWithEmail
        });
        setAdminSharedRecipient(null);
        setIsShareLinkInvalid(false);
        setIsShareLinkLoading(false);
      });
    } else {
      fetchCandidateById(resolvedCandidateId).then((record) => {
        if (mounted) setCandidate(record);
      });
      setSharedRecipient(null);
      setIsShareLinkInvalid(false);
      setIsShareLinkLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [isSharedView, resolvedCandidateId, shareToken]);

  useEffect(() => {
    let mounted = true;
    if (isSharedView || !candidate?.id) {
      setAdminSharedRecipient(null);
      return () => {
        mounted = false;
      };
    }

    fetchSharedProfiles().then((records) => {
      if (!mounted) return;
      let latestForCandidate: SharedProfileRecord | null = null;
      let latestTime = -Infinity;
      for (const item of records) {
        if (item.candidateId !== candidate.id) continue;
        const itemTime = new Date(item.sharedAt).getTime();
        if (Number.isNaN(itemTime)) continue;
        if (itemTime > latestTime) {
          latestTime = itemTime;
          latestForCandidate = item;
        }
      }

      if (!latestForCandidate) {
        setAdminSharedRecipient(null);
        return;
      }

      setAdminSharedRecipient({
        sharedWithName: latestForCandidate.sharedWithName,
        sharedWithEmail: latestForCandidate.sharedWithEmail
      });
    });

    return () => {
      mounted = false;
    };
  }, [candidate?.id, isSharedView]);

  useEffect(() => {
    let mounted = true;
    fetchSkillsState().then((state) => {
      if (mounted) {
        setSkillsState(state);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const availabilityText = useMemo(() => {
    if (!candidate) return "Full-time availability in 4 weeks";
    if (candidate.available.toLowerCase().startsWith("in ")) {
      return `Full-time availability ${candidate.available}`;
    }
    return `Availability: ${candidate.available}`;
  }, [candidate]);

  const profileContent = useMemo(
    () => getCandidateProfileContent(candidate, candidateProfileContentById),
    [candidate]
  );
  const {
    openModal,
    setOpenModal,
    aboutDraft,
    setAboutDraft,
    experienceDraft,
    setExperienceDraft,
    videoTitleDraft,
    setVideoTitleDraft,
    videoUrlDraft,
    setVideoUrlDraft,
    coderbyteScoreDraft,
    setCoderbyteScoreDraft,
    coderbyteLinkDraft,
    setCoderbyteLinkDraft,
    educationYearDraft,
    setEducationYearDraft,
    educationDegreeDraft,
    setEducationDegreeDraft,
    educationSchoolDraft,
    setEducationSchoolDraft,
    projectNameDraft,
    setProjectNameDraft,
    projectRoleDraft,
    setProjectRoleDraft,
    projectStartDateDraft,
    setProjectStartDateDraft,
    projectEndDateDraft,
    setProjectEndDateDraft,
    projectSummaryDraft,
    setProjectSummaryDraft,
    projectResponsibilitiesDraft,
    setProjectResponsibilitiesDraft,
    projectTechnologiesDraft,
    setProjectTechnologiesDraft,
    selectedSkillCategoryIdDraft,
    setSelectedSkillCategoryIdDraft,
    selectedSubSkillKeysDraft,
    setSelectedSubSkillKeysDraft,
    editingProjectIndex,
    setEditingProjectIndex,
    editingEducationIndex,
    setEditingEducationIndex,
    deleteProjectIndex,
    setDeleteProjectIndex,
    isShareProfileModalOpen,
    setIsShareProfileModalOpen,
    setProfileOverrides,
    effectiveProfileContent
  } = useCandidateProfileEditorState({ candidate, profileContent });
  useUnsavedChangesGuard(openModal !== null || isShareProfileModalOpen || deleteProjectIndex !== null);
  const hasProfileContent = useMemo(
    () => Boolean(candidate) && hasCoreProfileData(effectiveProfileContent),
    [candidate, effectiveProfileContent]
  );

  useEffect(() => {
    return () => {
      if (skillsSaveTimerRef.current) {
        window.clearTimeout(skillsSaveTimerRef.current);
      }
    };
  }, []);

  const skillTracks = useMemo(() => {
    const selections = effectiveProfileContent?.skillSelections ?? [];
    if (selections.length > 0) {
      const mapped = selections
        .map((selection) => {
          const category = skillsState.categories.find((item) => item.id === selection.categoryId);
          if (!category) return null;
          return getTrackFromSelection(selection, category);
        })
        .filter((item): item is SkillTrackItem => item !== null);
      if (mapped.length > 0) {
        return mapped;
      }
    }
    return getRelevantSkillTracks(skillsState.categories, candidate);
  }, [effectiveProfileContent?.skillSelections, skillsState.categories, candidate]);

  const radarMetrics = useMemo(
    () => getRadarMetrics(effectiveProfileContent?.skillSelections ?? [], skillsState.categories),
    [effectiveProfileContent?.skillSelections, skillsState.categories]
  );

  const navItems = useMemo<NavItem[]>(
    () => {
      const projectChildren = hasProfileContent
        ? (effectiveProfileContent?.projects ?? []).map((project, index) => ({
            id: `project-${index}`,
            label: project.name
          }))
        : [];
      const skillChildren = hasProfileContent ? skillTracks.map((track) => ({ id: track.id, label: track.title })) : [];
      return [
        ...STATIC_NAV_ITEMS,
        {
          id: "projects",
          label: "Projects",
          children: projectChildren.length > 0 ? projectChildren : undefined
        },
        {
          id: "skills",
          label: "Skills",
          children: skillChildren.length > 0 ? skillChildren : undefined
        }
      ];
    },
    [effectiveProfileContent, hasProfileContent, skillTracks]
  );

  const selectedSkillCategoryForModal = useMemo(
    () => skillsState.categories.find((category) => category.id === selectedSkillCategoryIdDraft) ?? null,
    [skillsState.categories, selectedSkillCategoryIdDraft]
  );

  if (isSharedView && isShareLinkLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f1f5f9] px-4">
        <div className="rounded-xl border border-[#efefef] bg-white px-6 py-5 text-sm text-[#475467] shadow-[0_10px_20px_rgba(148,163,184,0.2)]">
          Loading shared profile...
        </div>
      </div>
    );
  }

  if (isSharedView && isShareLinkInvalid) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f1f5f9] px-4">
        <div className="max-w-[520px] rounded-xl border border-[#efefef] bg-white px-6 py-6 text-center shadow-[0_10px_20px_rgba(148,163,184,0.2)]">
          <h1 className="text-xl font-semibold text-[#242424]">Link unavailable</h1>
          <p className="mt-2 text-sm text-[#667085]">This shared profile link is invalid, removed, or expired.</p>
        </div>
      </div>
    );
  }

  const goToSection = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    setActiveNav(id);
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const persistProfileUpdate = async (
    updater: (current: CandidateProfileContent) => CandidateProfileContent,
    options?: { silentSuccess?: boolean }
  ) => {
    if (!candidate) return;
    const current = effectiveProfileContent ?? emptyProfileContent();
    const nextProfile = updater(current);
    setProfileOverrides(nextProfile);
    try {
      const updated = await updateCandidate(candidate.id, {
        name: candidate.name,
        role: candidate.role,
        expectedSalary: candidate.expectedSalary,
        available: candidate.available,
        technologies: candidate.technologies,
        status: candidate.status,
        contact: candidate.contact,
        location: candidate.location,
        compensation: candidate.compensation,
        employment: candidate.employment,
        profile: nextProfile
      });
      setCandidate(updated);
      if (!options?.silentSuccess) {
        showToast({ variant: "success", title: "Profile section saved" });
      }
    } catch (error) {
      showToast({
        variant: "error",
        title: "Failed to save profile",
        message: error instanceof Error ? error.message : undefined
      });
    } finally {
      setProfileOverrides({});
    }
  };

  const saveSkillSelectionsWithRetry = async (nextSelections: CandidateProfileSkillSelection[]) => {
    if (!candidate) return;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const latest = (await fetchCandidateById(candidate.id)) ?? candidate;
        const baseProfile = getCandidateProfileContent(latest, candidateProfileContentById) ?? emptyProfileContent();
        const updated = await updateCandidate(latest.id, {
          name: latest.name,
          role: latest.role,
          expectedSalary: latest.expectedSalary,
          available: latest.available,
          technologies: latest.technologies,
          status: latest.status,
          contact: latest.contact,
          location: latest.location,
          compensation: latest.compensation,
          employment: latest.employment,
          profile: {
            ...baseProfile,
            skillSelections: nextSelections
          }
        });
        setCandidate(updated);
        setProfileOverrides((previous) => ({
          ...previous,
          skillSelections: undefined
        }));
        return;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
    showToast({
      variant: "error",
      title: "Failed to save profile skills",
      message: lastError instanceof Error ? lastError.message : undefined
    });
  };

  const flushQueuedSkillSelections = async () => {
    if (isFlushingSkillsSaveRef.current) return;
    isFlushingSkillsSaveRef.current = true;
    try {
      while (pendingSkillSelectionsRef.current) {
        const next = pendingSkillSelectionsRef.current;
        pendingSkillSelectionsRef.current = null;
        await saveSkillSelectionsWithRetry(next);
      }
    } finally {
      isFlushingSkillsSaveRef.current = false;
    }
  };

  const queueSkillSelectionsSave = (nextSelections: CandidateProfileSkillSelection[]) => {
    pendingSkillSelectionsRef.current = nextSelections;
    if (skillsSaveTimerRef.current) {
      window.clearTimeout(skillsSaveTimerRef.current);
    }
    skillsSaveTimerRef.current = window.setTimeout(() => {
      void flushQueuedSkillSelections();
    }, 400);
  };

  const openAddProjectModal = () => {
    setEditingProjectIndex(null);
    setProjectNameDraft("");
    setProjectRoleDraft(candidate?.role ?? "");
    setProjectStartDateDraft("");
    setProjectEndDateDraft("");
    setProjectSummaryDraft("");
    setProjectResponsibilitiesDraft("");
    setProjectTechnologiesDraft(candidate?.technologies ?? "");
    setOpenModal("project");
  };

  const openEditProjectModal = (index: number) => {
    const project = effectiveProfileContent?.projects?.[index];
    if (!project) return;
    const { startDate, endDate } = parseProjectDurationRange(project.duration);
    setEditingProjectIndex(index);
    setProjectNameDraft(project.name);
    setProjectRoleDraft(project.role);
    setProjectStartDateDraft(startDate);
    setProjectEndDateDraft(endDate);
    setProjectSummaryDraft(project.summary);
    setProjectResponsibilitiesDraft(project.responsibilities.join("\n"));
    setProjectTechnologiesDraft(project.technologies.join(", "));
    setOpenModal("project");
  };

  const openSkillsModalStepOne = () => {
    const existingSelections = effectiveProfileContent?.skillSelections ?? [];
    const preferredCategoryId = existingSelections[0]?.categoryId ?? skillsState.categories[0]?.id ?? "";
    const selectedFromPreferred = existingSelections.find((item) => item.categoryId === preferredCategoryId);
    setSelectedSkillCategoryIdDraft(preferredCategoryId);
    setSelectedSubSkillKeysDraft(
      (selectedFromPreferred?.selectedSubSkills ?? []).map((item) => skillEntryKey(item.skillId, item.level, item.capabilityId))
    );
    setOpenModal("skills-step-1");
  };

  const openAddEducationModal = () => {
    setEditingEducationIndex(null);
    setEducationYearDraft("");
    setEducationDegreeDraft("");
    setEducationSchoolDraft("");
    setOpenModal("education");
  };

  const openEditEducationModal = (index: number) => {
    const education = effectiveProfileContent?.education?.[index];
    if (!education) return;
    setEditingEducationIndex(index);
    setEducationYearDraft(education.year);
    setEducationDegreeDraft(education.degree);
    setEducationSchoolDraft(education.school);
    setOpenModal("education");
  };

  const deleteEducationItem = async (index: number) => {
    await persistProfileUpdate((current) => ({
      ...current,
      education: (current.education ?? []).filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const goToSkillsStepTwo = () => {
    if (!selectedSkillCategoryIdDraft) return;
    const existingForCategory = (effectiveProfileContent?.skillSelections ?? []).find(
      (item) => item.categoryId === selectedSkillCategoryIdDraft
    );
    setSelectedSubSkillKeysDraft(
      (existingForCategory?.selectedSubSkills ?? []).map((item) => skillEntryKey(item.skillId, item.level, item.capabilityId))
    );
    setOpenModal("skills-step-2");
  };

  const toggleSelectedSubSkill = (skillId: string, level: string, capabilityId: string) => {
    const key = skillEntryKey(skillId, level, capabilityId);
    setSelectedSubSkillKeysDraft((previous) =>
      previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key]
    );
  };

  const toggleProfileSubSkill = async (
    categoryId: string,
    skillId: string,
    level: string,
    capabilityId: string,
    checked: boolean
  ) => {
    const key = skillEntryKey(skillId, level, capabilityId);
    const current = effectiveProfileContent ?? emptyProfileContent();
    const existingSelections = current.skillSelections ?? [];
    const currentCategorySelection = existingSelections.find((selection) => selection.categoryId === categoryId);
    const currentSet = new Set(
      (currentCategorySelection?.selectedSubSkills ?? []).map((item) => skillEntryKey(item.skillId, item.level, item.capabilityId))
    );

    if (checked) {
      currentSet.add(key);
    } else {
      currentSet.delete(key);
    }

    const nextSelectedSubSkills = keysToSkillSelectionItems(Array.from(currentSet));

    const nextSelection: CandidateProfileSkillSelection = {
      categoryId,
      selectedSubSkills: nextSelectedSubSkills
    };
    const existingIndex = existingSelections.findIndex((selection) => selection.categoryId === categoryId);
    const nextSelections =
      existingIndex >= 0
        ? existingSelections.map((selection, index) => (index === existingIndex ? nextSelection : selection))
        : [...existingSelections, nextSelection];

    setProfileOverrides((previous) => ({
      ...previous,
      skillSelections: nextSelections
    }));
    queueSkillSelectionsSave(nextSelections);
  };

  return (
    <AdminShell hideSidebar>
      <ProfileTextModal
        open={openModal === "about"}
        title="Add About"
        label="About"
        value={aboutDraft}
        onChange={setAboutDraft}
        onClose={() => setOpenModal(null)}
        onSave={async () => {
          await persistProfileUpdate((current) => ({ ...current, about: aboutDraft.trim() }));
          setOpenModal(null);
        }}
      />
      <ProfileTextModal
        open={openModal === "experience"}
        title="Add Experience"
        label="Working As"
        value={experienceDraft}
        onChange={setExperienceDraft}
        onClose={() => setOpenModal(null)}
        onSave={async () => {
          await persistProfileUpdate((current) => ({ ...current, experience: experienceDraft.trim() }));
          setOpenModal(null);
        }}
      />
      <VideoIntroModal
        open={openModal === "video"}
        titleValue={videoTitleDraft}
        urlValue={videoUrlDraft}
        onChangeTitle={setVideoTitleDraft}
        onChangeUrl={setVideoUrlDraft}
        onClose={() => setOpenModal(null)}
        onSave={async () => {
          await persistProfileUpdate((current) => ({
            ...current,
            videoTitle: videoTitleDraft.trim(),
            videoUrl: videoUrlDraft.trim()
          }));
          setOpenModal(null);
        }}
      />
      <CoderbyteModal
        open={openModal === "coderbyte"}
        scoreValue={coderbyteScoreDraft}
        linkValue={coderbyteLinkDraft}
        onChangeScore={setCoderbyteScoreDraft}
        onChangeLink={setCoderbyteLinkDraft}
        onClose={() => setOpenModal(null)}
        onSave={async () => {
          await persistProfileUpdate((current) => ({
            ...current,
            coderbyteScore: coderbyteScoreDraft.trim(),
            coderbyteLink: coderbyteLinkDraft.trim()
          }));
          setOpenModal(null);
        }}
      />
      <EducationModal
        open={openModal === "education"}
        title={editingEducationIndex !== null ? "Edit Education" : "Add Education"}
        saveLabel={editingEducationIndex !== null ? "Update" : "Save"}
        yearValue={educationYearDraft}
        degreeValue={educationDegreeDraft}
        schoolValue={educationSchoolDraft}
        onChangeYear={setEducationYearDraft}
        onChangeDegree={setEducationDegreeDraft}
        onChangeSchool={setEducationSchoolDraft}
        onClose={() => {
          setEditingEducationIndex(null);
          setOpenModal(null);
        }}
        onSave={async () => {
          if (!educationYearDraft.trim() || !educationDegreeDraft.trim() || !educationSchoolDraft.trim()) {
            return;
          }
          await persistProfileUpdate((current) => {
            const nextEducation = [...(current.education ?? [])];
            const payload = {
              year: educationYearDraft.trim(),
              degree: educationDegreeDraft.trim(),
              school: educationSchoolDraft.trim()
            };

            if (
              editingEducationIndex !== null &&
              editingEducationIndex >= 0 &&
              editingEducationIndex < nextEducation.length
            ) {
              nextEducation[editingEducationIndex] = payload;
              return { ...current, education: nextEducation };
            }

            return {
              ...current,
              education: [...nextEducation, payload]
            };
          });
          setEducationYearDraft("");
          setEducationDegreeDraft("");
          setEducationSchoolDraft("");
          setEditingEducationIndex(null);
          setOpenModal(null);
        }}
      />
      <ProjectExperienceModal
        open={openModal === "project"}
        title={editingProjectIndex !== null ? "Edit Project Experience" : "Add Project Experience"}
        saveLabel={editingProjectIndex !== null ? "Update" : "Save"}
        projectName={projectNameDraft}
        role={projectRoleDraft}
        startDate={projectStartDateDraft}
        endDate={projectEndDateDraft}
        summary={projectSummaryDraft}
        responsibilities={projectResponsibilitiesDraft}
        technologies={projectTechnologiesDraft}
        onChangeProjectName={setProjectNameDraft}
        onChangeRole={setProjectRoleDraft}
        onChangeStartDate={setProjectStartDateDraft}
        onChangeEndDate={setProjectEndDateDraft}
        onChangeSummary={setProjectSummaryDraft}
        onChangeResponsibilities={setProjectResponsibilitiesDraft}
        onChangeTechnologies={setProjectTechnologiesDraft}
        onClose={() => setOpenModal(null)}
        onSave={async () => {
          if (!projectNameDraft.trim() || !projectRoleDraft.trim()) {
            return;
          }
          if (!projectStartDateDraft || !projectEndDateDraft) {
            showToast({ variant: "error", title: "Project date range is required" });
            return;
          }
          if (projectEndDateDraft < projectStartDateDraft) {
            showToast({ variant: "error", title: "End date must be after start date" });
            return;
          }
          const durationLabel = formatProjectDurationRange(projectStartDateDraft, projectEndDateDraft);
          const nextProject: CandidateProject = {
            name: projectNameDraft.trim(),
            role: projectRoleDraft.trim(),
            duration: durationLabel || "On-going",
            summary: projectSummaryDraft.trim() || "Project summary",
            responsibilities: projectResponsibilitiesDraft
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
            technologies: projectTechnologiesDraft
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          };
          await persistProfileUpdate((current) => {
            const existing = [...(current.projects ?? [])];
            if (editingProjectIndex !== null && editingProjectIndex >= 0 && editingProjectIndex < existing.length) {
              existing[editingProjectIndex] = nextProject;
              return { ...current, projects: existing };
            }
            return { ...current, projects: [...existing, nextProject] };
          });
          setProjectNameDraft("");
          setProjectStartDateDraft("");
          setProjectEndDateDraft("");
          setProjectSummaryDraft("");
          setProjectResponsibilitiesDraft("");
          setProjectTechnologiesDraft(candidate?.technologies ?? "");
          setEditingProjectIndex(null);
          setOpenModal(null);
        }}
      />
      <SkillsStepOneModal
        open={openModal === "skills-step-1"}
        categories={skillsState.categories}
        selectedCategoryId={selectedSkillCategoryIdDraft}
        onSelectCategory={(value) => setSelectedSkillCategoryIdDraft(value)}
        onClose={() => setOpenModal(null)}
        onNext={goToSkillsStepTwo}
      />
      <SkillsStepTwoModal
        open={openModal === "skills-step-2"}
        category={selectedSkillCategoryForModal}
        selectedKeys={new Set(selectedSubSkillKeysDraft)}
        onToggle={toggleSelectedSubSkill}
        onClose={() => setOpenModal(null)}
        onSave={async () => {
          if (!selectedSkillCategoryForModal) return;
          const selectedSubSkills = keysToSkillSelectionItems(selectedSubSkillKeysDraft);
          await persistProfileUpdate((current) => {
            const existing = current.skillSelections ?? [];
            const nextSelection: CandidateProfileSkillSelection = {
              categoryId: selectedSkillCategoryForModal.id,
              selectedSubSkills
            };
            const existingIndex = existing.findIndex((item) => item.categoryId === selectedSkillCategoryForModal.id);
            const nextSelections =
              existingIndex >= 0
                ? existing.map((item, index) => (index === existingIndex ? nextSelection : item))
                : [...existing, nextSelection];
            return {
              ...current,
              skillSelections: nextSelections
            };
          });
          setOpenModal(null);
        }}
      />
      <ConfirmDeleteModal
        open={deleteProjectIndex !== null}
        title="Delete Project Experience"
        description="Are you sure you want to delete this project?"
        onCancel={() => setDeleteProjectIndex(null)}
        onConfirm={async () => {
          if (deleteProjectIndex === null) return;
          const target = deleteProjectIndex;
          await persistProfileUpdate((current) => ({
            ...current,
            projects: (current.projects ?? []).filter((_, index) => index !== target)
          }));
          setDeleteProjectIndex(null);
        }}
      />
      <ShareProfileModal
        open={isShareProfileModalOpen}
        candidate={candidate}
        onClose={() => setIsShareProfileModalOpen(false)}
        onShare={async ({ name, email, expiration, rateLabel }) => {
          if (!name || !email) {
            showToast({ variant: "error", title: "Name and email are required" });
            return;
          }
          if (!expiration) {
            showToast({ variant: "error", title: "Link expiration date is required" });
            return;
          }
          if (!candidate) {
            showToast({ variant: "error", title: "Candidate not found" });
            return;
          }
          try {
            const created = await addSharedProfile({
              candidateId: candidate.id,
              candidateName: candidate.name,
              candidateRole: candidate.role,
              sharedWithName: name,
              sharedWithEmail: email,
              rateLabel,
              expirationDate: expiration
            });
            const sharedUrl = getSharedProfilePublicUrl(created);
            try {
              await navigator.clipboard.writeText(sharedUrl);
            } catch {
              // no-op fallback: link remains available in Shared Profiles table
            }
            setIsShareProfileModalOpen(false);
            showToast({ variant: "success", title: "Profile shared successfully", message: "Unique link copied to clipboard" });
          } catch (error) {
            showToast({
              variant: "error",
              title: "Failed to share profile",
              message: error instanceof Error ? error.message : undefined
            });
          }
        }}
      />
      <div className="min-h-full bg-[#f1f5f9] p-6">
        <div className="mx-auto w-full max-w-[1120px]">
          <div className="px-8 pb-4 pt-8">
            <div className="flex flex-col items-center justify-center pb-8">
              <img src={brandLogo} alt="Chromedia" className="h-[70px] w-[347px] object-cover" />
            </div>
            {isSharedView ? (
              <div className="flex items-center justify-between">
                <div className="flex h-10 items-center gap-3">
                  <img src={clientAvatar} alt="Client avatar" className="h-10 w-10 rounded-full" />
                  <div className="text-sm leading-5 text-[#242424]">
                    <p>{sharedRecipient?.sharedWithName ?? "Client Name"}</p>
                    <p>{sharedRecipient?.sharedWithEmail ?? "Email Address"}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          {!isSharedView ? (
            <div className="flex justify-end px-8 pb-4">
              <Button
                variant="primary"
                className="h-9 min-w-fit whitespace-nowrap px-4 text-sm"
                onClick={() => setIsShareProfileModalOpen(true)}
              >
                Share to client
              </Button>
            </div>
          ) : null}

          <div className="rounded-[4px] bg-white px-8 pb-8 pt-8">
            <header>
              <div className="mt-8 flex items-center gap-4 border-b border-[#d1d1d1] pb-8">
                {!isSharedView ? (
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center border-r border-[#d1d1d1] pr-4 text-[#494949]"
                    onClick={() => {
                      navigate(APP_ROUTES.admin.candidates);
                    }}
                    aria-label="Back to candidates"
                  >
                    <ArrowBackIcon />
                  </button>
                ) : null}

                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <img src={candidateAvatar} alt="Dianne" className="h-10 w-10 rounded-full object-cover" />
                  <div>
                    <h1 className="text-[20px] font-semibold leading-[30px] text-[#242424]">{candidate?.name ?? "Dianne"}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-[#494949]">
                      <p className="text-base font-semibold leading-6">{candidate?.role ?? "Senior Web Designer"}</p>
                      <p className="flex items-center gap-2 text-sm leading-5"><LocationIcon />Cebu, Philippines</p>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-[#494949]">
                  <p className="text-[20px] font-semibold leading-[30px] text-[#242424]">{candidate?.expectedSalary ?? "$4,556/month"}</p>
                  <p className="text-sm leading-5">{availabilityText}</p>
                  <p className="text-xs italic leading-[18px]">Rate guaranteed until [date].</p>
                  <div className="mt-1 flex gap-1">
                    <Button variant="primary" className="h-7 min-w-fit shrink-0 whitespace-nowrap px-5 text-sm font-normal leading-5">
                      Email Ryan
                    </Button>
                    <Button variant="primary" className="h-7 min-w-fit shrink-0 whitespace-nowrap px-5 text-sm font-normal leading-5">
                      Schedule a meeting
                    </Button>
                  </div>
                </div>
              </div>
            </header>

            <main className="mt-6 flex items-start gap-6">
              <aside className="sticky top-6 w-[240px] shrink-0">
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = activeNav === item.id;
                    return (
                      <div key={item.id}>
                        <button
                          type="button"
                          onClick={() => goToSection(item.id)}
                          className={`w-full rounded-md px-3 py-2 text-left text-sm font-semibold leading-5 ${isActive ? "bg-[#e8f4fb] text-[#1595d4]" : "text-[#667085]"}`}
                        >
                          {item.label}
                        </button>
                        {item.children ? (
                          <div className="mt-1 space-y-1 pl-2">
                            {item.children.map((child) => (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => goToSection(child.id)}
                                className="block w-full rounded-md px-3 py-1 text-left text-sm font-semibold leading-5 text-[#667085] hover:bg-[#f1f5f9]"
                              >
                                {child.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </nav>
              </aside>

              <div className="flex-1 space-y-8">
                {hasProfileContent ? (
                  <CandidateProfileFilledSections
                    candidateRole={candidate?.role}
                    effectiveProfileContent={effectiveProfileContent}
                    skillTracks={skillTracks}
                    radarMetrics={radarMetrics}
                    SectionHeadingComponent={SectionHeading}
                    CandidateProjectCardComponent={CandidateProjectCard}
                    SkillTrackComponent={SkillTrack}
                    SkillsRadarChartComponent={SkillsRadarChart}
                    EditIconComponent={EditIcon}
                    DeleteIconComponent={DeleteIcon}
                    PlayIconComponent={PlayIcon}
                    onOpenAbout={isSharedView ? undefined : (() => {
                      setAboutDraft(effectiveProfileContent?.about ?? "");
                      setOpenModal("about");
                    })}
                    onOpenExperience={isSharedView ? undefined : (() => {
                      setExperienceDraft(effectiveProfileContent?.experience ?? "");
                      setOpenModal("experience");
                    })}
                    onOpenVideo={isSharedView ? undefined : (() => setOpenModal("video"))}
                    onOpenCoderbyte={isSharedView ? undefined : (() => {
                      setCoderbyteScoreDraft(effectiveProfileContent?.coderbyteScore ?? "");
                      setCoderbyteLinkDraft(effectiveProfileContent?.coderbyteLink ?? "");
                      setOpenModal("coderbyte");
                    })}
                    onOpenAddProject={isSharedView ? undefined : openAddProjectModal}
                    onOpenEditProject={isSharedView ? undefined : openEditProjectModal}
                    onDeleteProject={isSharedView ? undefined : setDeleteProjectIndex}
                    onOpenAddEducation={isSharedView ? undefined : openAddEducationModal}
                    onOpenEditEducation={isSharedView ? undefined : openEditEducationModal}
                    onDeleteEducation={isSharedView ? undefined : ((index) => void deleteEducationItem(index))}
                    onOpenSkills={isSharedView ? undefined : openSkillsModalStepOne}
                    onToggleProfileSubSkill={
                      isSharedView
                        ? undefined
                        : (categoryId, skillId, level, capabilityId, checked) =>
                            void toggleProfileSubSkill(categoryId, skillId, level, capabilityId, checked)
                    }
                  />
                ) : (
                  <CandidateProfileEmptySections
                    candidateRole={candidate?.role}
                    effectiveProfileContent={effectiveProfileContent}
                    skillTracks={skillTracks}
                    PlaceholderSectionRowComponent={PlaceholderSectionRow}
                    CandidateProjectCardComponent={CandidateProjectCard}
                    SkillTrackComponent={SkillTrack}
                    onOpenAbout={isSharedView ? undefined : (() => {
                      setAboutDraft(effectiveProfileContent?.about ?? "");
                      setOpenModal("about");
                    })}
                    onOpenExperience={isSharedView ? undefined : (() => {
                      setExperienceDraft(effectiveProfileContent?.experience ?? "");
                      setOpenModal("experience");
                    })}
                    onOpenVideo={isSharedView ? undefined : (() => setOpenModal("video"))}
                    onOpenCoderbyte={isSharedView ? undefined : (() => {
                      setCoderbyteScoreDraft(effectiveProfileContent?.coderbyteScore ?? "");
                      setCoderbyteLinkDraft(effectiveProfileContent?.coderbyteLink ?? "");
                      setOpenModal("coderbyte");
                    })}
                    onOpenAddProject={isSharedView ? undefined : openAddProjectModal}
                    onOpenEditProject={isSharedView ? undefined : openEditProjectModal}
                    onDeleteProject={isSharedView ? undefined : setDeleteProjectIndex}
                    onOpenAddEducation={isSharedView ? undefined : openAddEducationModal}
                    onOpenSkills={isSharedView ? undefined : openSkillsModalStepOne}
                    onToggleProfileSubSkill={
                      isSharedView
                        ? undefined
                        : (categoryId, skillId, level, capabilityId, checked) =>
                            void toggleProfileSubSkill(categoryId, skillId, level, capabilityId, checked)
                    }
                  />
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
