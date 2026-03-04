import { ReactNode } from "react";
import type { CandidateProfileContent, CandidateProject, RadarMetric, SkillCategory, SkillTrackItem } from "./types";

type SectionHeadingProps = {
  id: string;
  title: string;
  withAdd?: boolean;
  onAdd?: () => void;
  actionType?: "plus" | "edit";
};

type PlaceholderSectionRowProps = {
  id: string;
  title: string;
  onAdd?: () => void;
  children?: ReactNode;
  actionType?: "plus" | "edit";
};

type SkillsRadarChartProps = {
  metrics: RadarMetric[];
};

type SkillTrackProps = {
  id: string;
  title: string;
  categories: SkillCategory[];
  onToggle?: (skillId: string, level: string, capabilityId: string, checked: boolean) => void;
};

type CandidateProjectCardProps = {
  id: string;
  project: CandidateProject;
  onEdit?: () => void;
  onDelete?: () => void;
};

type CandidateProfileSectionsSharedProps = {
  candidateRole?: string;
  effectiveProfileContent: CandidateProfileContent | null;
  skillTracks: SkillTrackItem[];
  onOpenAbout?: () => void;
  onOpenExperience?: () => void;
  onOpenVideo?: () => void;
  onOpenCoderbyte?: () => void;
  onOpenAddProject?: () => void;
  onOpenEditProject?: (index: number) => void;
  onDeleteProject?: (index: number) => void;
  onOpenAddEducation?: () => void;
  onOpenEditEducation?: (index: number) => void;
  onDeleteEducation?: (index: number) => void;
  onOpenSkills?: () => void;
  onToggleProfileSubSkill?: (
    categoryId: string,
    skillId: string,
    level: string,
    capabilityId: string,
    checked: boolean
  ) => void;
};

type CandidateProfileFilledComponentProps = {
  SectionHeadingComponent: (props: SectionHeadingProps) => ReactNode;
  CandidateProjectCardComponent: (props: CandidateProjectCardProps) => ReactNode;
  SkillTrackComponent: (props: SkillTrackProps) => ReactNode;
  SkillsRadarChartComponent: (props: SkillsRadarChartProps) => ReactNode;
  EditIconComponent: () => ReactNode;
  DeleteIconComponent: () => ReactNode;
  PlayIconComponent: () => ReactNode;
};

type CandidateProfileEmptyComponentProps = {
  PlaceholderSectionRowComponent: (props: PlaceholderSectionRowProps) => ReactNode;
  CandidateProjectCardComponent: (props: CandidateProjectCardProps) => ReactNode;
  SkillTrackComponent: (props: SkillTrackProps) => ReactNode;
};

export function CandidateProfileFilledSections({
  candidateRole,
  effectiveProfileContent,
  skillTracks,
  onOpenAbout,
  onOpenExperience,
  onOpenVideo,
  onOpenCoderbyte,
  onOpenAddProject,
  onOpenEditProject,
  onDeleteProject,
  onOpenAddEducation,
  onOpenEditEducation,
  onDeleteEducation,
  onOpenSkills,
  onToggleProfileSubSkill,
  radarMetrics,
  SectionHeadingComponent,
  CandidateProjectCardComponent,
  SkillTrackComponent,
  SkillsRadarChartComponent,
  EditIconComponent,
  DeleteIconComponent,
  PlayIconComponent
}: CandidateProfileSectionsSharedProps & CandidateProfileFilledComponentProps & { radarMetrics: RadarMetric[] }) {
  return (
    <>
      <section>
        <SectionHeadingComponent
          id="about"
          title="ABOUT"
          withAdd
          actionType={(effectiveProfileContent?.about ?? "").trim() ? "edit" : "plus"}
          onAdd={onOpenAbout}
        />
        {(effectiveProfileContent?.about ?? "").trim() ? (
          <p className="mt-2 px-2 text-sm leading-5 text-[#494949]">{effectiveProfileContent?.about ?? ""}</p>
        ) : (
          <p className="mt-2 px-2 text-sm leading-5 text-[#98a2b3]">
            No about info yet. Add a short intro about this candidate&apos;s strengths and focus.
          </p>
        )}
      </section>

      <section>
        <SectionHeadingComponent
          id="designer-experience"
          title={`WORKING AS ${candidateRole ? candidateRole.toUpperCase() : "[A ROLE]"}`}
          withAdd
          actionType={(effectiveProfileContent?.experience ?? "").trim() ? "edit" : "plus"}
          onAdd={onOpenExperience}
        />
        {(effectiveProfileContent?.experience ?? "").trim() ? (
          <p className="mt-2 px-2 text-sm leading-5 text-[#494949]">{effectiveProfileContent?.experience ?? ""}</p>
        ) : (
          <p className="mt-2 px-2 text-sm leading-5 text-[#98a2b3]">
            No role experience added yet. Summarize scope, impact, and years of relevant work.
          </p>
        )}
      </section>

      <section id="video-introduction" className="scroll-mt-8">
        <SectionHeadingComponent id="video-introduction-heading" title="Video Introduction" withAdd onAdd={onOpenVideo} />
        <div className="mt-2 rounded-md bg-[#e8f4fb] py-4" aria-label="Designer experience video">
          <div className="mx-auto flex h-[215px] w-[406px] items-center justify-center rounded bg-[#d0eaf6]"><PlayIconComponent /></div>
          {effectiveProfileContent?.videoTitle || effectiveProfileContent?.videoUrl ? (
            <div className="mx-auto mt-3 w-[406px] max-w-full text-xs leading-[18px] text-[#475467]">
              {effectiveProfileContent?.videoTitle ? <p className="font-semibold">{effectiveProfileContent.videoTitle}</p> : null}
              {effectiveProfileContent?.videoUrl ? <p className="truncate">{effectiveProfileContent.videoUrl}</p> : null}
            </div>
          ) : (
            <p className="mx-auto mt-3 w-[406px] max-w-full text-xs leading-[18px] text-[#98a2b3]">
              No video added yet. Add a video title and link so clients can quickly get to know the candidate.
            </p>
          )}
        </div>
      </section>

      <section id="coderbyte" className="scroll-mt-8">
        <SectionHeadingComponent
          id="coderbyte-heading"
          title="Coderbyte Results"
          withAdd
          actionType={(effectiveProfileContent?.coderbyteScore ?? "").trim() || (effectiveProfileContent?.coderbyteLink ?? "").trim() ? "edit" : "plus"}
          onAdd={onOpenCoderbyte}
        />
        <div className="mt-2 rounded-lg bg-[#e8f4fb] py-4 text-center text-sm font-semibold leading-5 text-[#494949]">
          {(effectiveProfileContent?.coderbyteScore || effectiveProfileContent?.coderbyteLink) ? (
            <div className="space-y-1">
              {effectiveProfileContent?.coderbyteScore ? <p>{effectiveProfileContent.coderbyteScore}</p> : null}
              {effectiveProfileContent?.coderbyteLink ? <p className="text-xs font-normal">{effectiveProfileContent.coderbyteLink}</p> : null}
            </div>
          ) : (
            <p className="px-4 text-sm font-normal leading-5 text-[#98a2b3]">
              No assessment result yet. Add a score and link to provide technical signal.
            </p>
          )}
        </div>
      </section>

      <section id="projects" className="scroll-mt-8 space-y-4">
        <SectionHeadingComponent id="projects-heading" title="Project Experience" withAdd onAdd={onOpenAddProject} />
        {(effectiveProfileContent?.projects ?? []).length > 0 ? (
          (effectiveProfileContent?.projects ?? []).map((project, index) => (
            <CandidateProjectCardComponent
              key={`${project.name}-${index}`}
              id={`project-${index}`}
              project={project}
              onEdit={onOpenEditProject ? () => onOpenEditProject(index) : undefined}
              onDelete={onDeleteProject ? () => onDeleteProject(index) : undefined}
            />
          ))
        ) : (
          <p className="px-2 text-sm leading-5 text-[#98a2b3]">
            No projects added yet. Add project context, responsibilities, and technologies used.
          </p>
        )}
      </section>

      <section id="education" className="scroll-mt-8">
        <SectionHeadingComponent id="education-heading" title="EDUCATION" withAdd onAdd={onOpenAddEducation} />
        {(effectiveProfileContent?.education ?? []).length > 0 ? (
          <div className="mt-2 space-y-2 px-2 text-sm leading-5 text-[#494949]">
            {(effectiveProfileContent?.education ?? []).map((education, index) => (
              <div key={`${education.year}-${education.degree}`} className="flex items-start gap-8">
                <p className="w-8 shrink-0">{education.year}</p>
                <div>
                  <div className="flex items-center gap-1">
                    <p>{education.degree}</p>
                    {onOpenEditEducation ? (
                      <button type="button" className="text-[#1595d4]" aria-label={`Edit education ${education.year}`} onClick={() => onOpenEditEducation(index)}>
                        <EditIconComponent />
                      </button>
                    ) : null}
                    {onDeleteEducation ? (
                      <button type="button" className="text-[#1595d4]" aria-label={`Delete education ${education.year}`} onClick={() => onDeleteEducation(index)}>
                        <DeleteIconComponent />
                      </button>
                    ) : null}
                  </div>
                  <p className="text-[#797979]">{education.school}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 px-2 text-sm leading-5 text-[#98a2b3]">
            No education records yet. Add school, degree, and graduation year.
          </p>
        )}
      </section>

      <section id="skills" className="scroll-mt-8">
        <SectionHeadingComponent id="skills-heading" title="Skills" withAdd onAdd={onOpenSkills} />
        {(effectiveProfileContent?.skillSelections ?? []).length > 0 ? (
          <div className="mt-4 flex justify-center">
            <SkillsRadarChartComponent metrics={radarMetrics} />
          </div>
        ) : (
          <p className="mt-2 px-2 text-sm leading-5 text-[#98a2b3]">
            No skills selected yet. Add skill categories and subskills to generate a capability profile.
          </p>
        )}
      </section>

      {(effectiveProfileContent?.skillSelections ?? []).length > 0 ? (
        skillTracks.map((track) => (
          <SkillTrackComponent
            key={track.id}
            id={track.id}
            title={track.title}
            categories={track.categories}
            onToggle={
              onToggleProfileSubSkill
                ? (skillId, level, capabilityId, checked) =>
                    onToggleProfileSubSkill(track.categoryId, skillId, level, capabilityId, checked)
                : undefined
            }
          />
        ))
      ) : null}
    </>
  );
}

export function CandidateProfileEmptySections({
  candidateRole,
  effectiveProfileContent,
  skillTracks,
  onOpenAbout,
  onOpenExperience,
  onOpenVideo,
  onOpenCoderbyte,
  onOpenAddProject,
  onOpenEditProject,
  onDeleteProject,
  onOpenAddEducation,
  onOpenSkills,
  onToggleProfileSubSkill,
  PlaceholderSectionRowComponent,
  CandidateProjectCardComponent,
  SkillTrackComponent
}: Omit<CandidateProfileSectionsSharedProps, "onOpenEditEducation" | "onDeleteEducation"> & CandidateProfileEmptyComponentProps) {
  return (
    <div className="space-y-10 pt-1">
      <PlaceholderSectionRowComponent id="about" title="About" actionType={(effectiveProfileContent?.about ?? "").trim() ? "edit" : "plus"} onAdd={onOpenAbout}>
        {effectiveProfileContent?.about ? (
          <p>{effectiveProfileContent.about}</p>
        ) : (
          <p className="text-[#98a2b3]">No about info yet. Add a short intro about this candidate&apos;s strengths and focus.</p>
        )}
      </PlaceholderSectionRowComponent>
      <PlaceholderSectionRowComponent id="designer-experience" title={`Working as ${candidateRole ?? "ROLE"}`} actionType={(effectiveProfileContent?.experience ?? "").trim() ? "edit" : "plus"} onAdd={onOpenExperience}>
        {effectiveProfileContent?.experience ? (
          <p>{effectiveProfileContent.experience}</p>
        ) : (
          <p className="text-[#98a2b3]">No role experience added yet. Summarize scope, impact, and years of relevant work.</p>
        )}
      </PlaceholderSectionRowComponent>
      <PlaceholderSectionRowComponent id="video-introduction" title="Video Introduction" onAdd={onOpenVideo}>
        {effectiveProfileContent?.videoTitle ? <p className="font-semibold">{effectiveProfileContent.videoTitle}</p> : null}
        {effectiveProfileContent?.videoUrl ? <p>{effectiveProfileContent.videoUrl}</p> : null}
        {!effectiveProfileContent?.videoTitle && !effectiveProfileContent?.videoUrl ? (
          <p className="text-[#98a2b3]">No video added yet. Add a video title and link so clients can quickly get to know the candidate.</p>
        ) : null}
      </PlaceholderSectionRowComponent>
      <PlaceholderSectionRowComponent id="coderbyte" title="Coderbyte Results" actionType={(effectiveProfileContent?.coderbyteScore ?? "").trim() || (effectiveProfileContent?.coderbyteLink ?? "").trim() ? "edit" : "plus"} onAdd={onOpenCoderbyte}>
        {effectiveProfileContent?.coderbyteScore ? <p className="font-semibold">{effectiveProfileContent.coderbyteScore}</p> : null}
        {effectiveProfileContent?.coderbyteLink ? <p>{effectiveProfileContent.coderbyteLink}</p> : null}
        {!effectiveProfileContent?.coderbyteScore && !effectiveProfileContent?.coderbyteLink ? (
          <p className="text-[#98a2b3]">No assessment result yet. Add a score and link to provide technical signal.</p>
        ) : null}
      </PlaceholderSectionRowComponent>
      <PlaceholderSectionRowComponent id="projects" title="Project Experience" onAdd={onOpenAddProject}>
        {(effectiveProfileContent?.projects ?? []).length > 0 ? (
          <div className="mt-3 space-y-3">
            {(effectiveProfileContent?.projects ?? []).map((project, index) => (
              <CandidateProjectCardComponent
                key={`${project.name}-${index}`}
                id={`project-${index}`}
                project={project}
                onEdit={onOpenEditProject ? () => onOpenEditProject(index) : undefined}
                onDelete={onDeleteProject ? () => onDeleteProject(index) : undefined}
              />
            ))}
          </div>
        ) : (
          <p className="text-[#98a2b3]">No projects added yet. Add project context, responsibilities, and technologies used.</p>
        )}
      </PlaceholderSectionRowComponent>
      <PlaceholderSectionRowComponent id="education" title="Education" onAdd={onOpenAddEducation}>
        {(effectiveProfileContent?.education ?? []).length > 0 ? (
          (effectiveProfileContent?.education ?? []).map((education) => (
            <p key={`${education.year}-${education.degree}`}>{education.year} - {education.degree}</p>
          ))
        ) : (
          <p className="text-[#98a2b3]">No education records yet. Add school, degree, and graduation year.</p>
        )}
      </PlaceholderSectionRowComponent>
      <PlaceholderSectionRowComponent id="skills" title="Skills" onAdd={onOpenSkills}>
        {(effectiveProfileContent?.skillSelections ?? []).length > 0 ? (
          <div className="mt-3 space-y-6">
            {skillTracks.map((track) => (
              <SkillTrackComponent
                key={track.id}
                id={track.id}
                title={track.title}
                categories={track.categories}
                onToggle={
                  onToggleProfileSubSkill
                    ? (skillId, level, capabilityId, checked) =>
                        onToggleProfileSubSkill(track.categoryId, skillId, level, capabilityId, checked)
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-[#98a2b3]">No skills selected yet. Add skill categories and subskills to generate a capability profile.</p>
        )}
      </PlaceholderSectionRowComponent>
    </div>
  );
}
