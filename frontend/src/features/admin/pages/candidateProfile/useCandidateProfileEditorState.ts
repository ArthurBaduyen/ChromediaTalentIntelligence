import { useEffect, useMemo, useState } from "react";
import type { CandidateRecord } from "../../data/candidatesDb";
import type { CandidateProfileContent, CandidateProfileModalType } from "./types";

type Params = {
  candidate?: CandidateRecord;
  profileContent: CandidateProfileContent | null;
};

export function useCandidateProfileEditorState({ candidate, profileContent }: Params) {
  const [openModal, setOpenModal] = useState<CandidateProfileModalType>(null);
  const [aboutDraft, setAboutDraft] = useState("");
  const [experienceDraft, setExperienceDraft] = useState("");
  const [videoTitleDraft, setVideoTitleDraft] = useState("");
  const [videoUrlDraft, setVideoUrlDraft] = useState("");
  const [coderbyteScoreDraft, setCoderbyteScoreDraft] = useState("");
  const [coderbyteLinkDraft, setCoderbyteLinkDraft] = useState("");
  const [educationYearDraft, setEducationYearDraft] = useState("");
  const [educationDegreeDraft, setEducationDegreeDraft] = useState("");
  const [educationSchoolDraft, setEducationSchoolDraft] = useState("");
  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [projectRoleDraft, setProjectRoleDraft] = useState("");
  const [projectStartDateDraft, setProjectStartDateDraft] = useState("");
  const [projectEndDateDraft, setProjectEndDateDraft] = useState("");
  const [projectSummaryDraft, setProjectSummaryDraft] = useState("");
  const [projectResponsibilitiesDraft, setProjectResponsibilitiesDraft] = useState("");
  const [projectTechnologiesDraft, setProjectTechnologiesDraft] = useState("");
  const [selectedSkillCategoryIdDraft, setSelectedSkillCategoryIdDraft] = useState("");
  const [selectedSubSkillKeysDraft, setSelectedSubSkillKeysDraft] = useState<string[]>([]);
  const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null);
  const [editingEducationIndex, setEditingEducationIndex] = useState<number | null>(null);
  const [deleteProjectIndex, setDeleteProjectIndex] = useState<number | null>(null);
  const [isShareProfileModalOpen, setIsShareProfileModalOpen] = useState(false);
  const [profileOverrides, setProfileOverrides] = useState<Partial<CandidateProfileContent>>({});

  const effectiveProfileContent = useMemo(() => {
    if (!profileContent) return null;
    return {
      ...profileContent,
      ...profileOverrides,
      education: profileOverrides.education ?? profileContent.education,
      projects: profileOverrides.projects ?? profileContent.projects
    };
  }, [profileContent, profileOverrides]);

  useEffect(() => {
    setProfileOverrides({});
    setAboutDraft(profileContent?.about ?? "");
    setExperienceDraft(profileContent?.experience ?? "");
    setVideoTitleDraft(profileContent?.videoTitle ?? "");
    setVideoUrlDraft(profileContent?.videoUrl ?? "");
    setCoderbyteScoreDraft(profileContent?.coderbyteScore ?? "");
    setCoderbyteLinkDraft(profileContent?.coderbyteLink ?? "");
    setEducationYearDraft("");
    setEducationDegreeDraft("");
    setEducationSchoolDraft("");
    setProjectNameDraft("");
    setProjectRoleDraft(candidate?.role ?? "");
    setProjectStartDateDraft("");
    setProjectEndDateDraft("");
    setProjectSummaryDraft("");
    setProjectResponsibilitiesDraft("");
    setProjectTechnologiesDraft(candidate?.technologies ?? "");
    setSelectedSkillCategoryIdDraft("");
    setSelectedSubSkillKeysDraft([]);
    setEditingProjectIndex(null);
    setEditingEducationIndex(null);
    setDeleteProjectIndex(null);
    setOpenModal(null);
  }, [candidate?.id, candidate?.role, candidate?.technologies, profileContent]);

  return {
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
    profileOverrides,
    setProfileOverrides,
    effectiveProfileContent
  };
}
