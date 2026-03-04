import type { CandidateProfileData } from "../../data/candidatesDb";

export type SkillCategory = {
  title: string;
  tag: string;
  levels: {
    label: string;
    items: { text: string; checked: boolean; skillId?: string; level?: string; capabilityId?: string }[];
    questions: string[];
  }[];
};

export type SkillTrackItem = {
  id: string;
  categoryId: string;
  title: string;
  categories: SkillCategory[];
};

export type CandidateProject = {
  name: string;
  role: string;
  duration: string;
  summary: string;
  responsibilities: string[];
  technologies: string[];
};

export type CandidateProfileContent = CandidateProfileData;

export type CandidateProfileModalType =
  | null
  | "about"
  | "experience"
  | "video"
  | "coderbyte"
  | "education"
  | "project"
  | "skills-step-1"
  | "skills-step-2";

export type RadarMetric = {
  label: string;
  value: number;
};
