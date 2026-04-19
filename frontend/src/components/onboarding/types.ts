export type WizardStep = 1 | 2 | 3;

export type QuestionType = "mcq" | "short";

export type StageTab = "basics" | "deep";

export type SkillGap = {
  skill: string;
  reason: string;
  priority: "High" | "Medium" | "Low";
};

export type AssessmentQuestion = {
  id: string;
  skill: string;
  prompt: string;
  type: QuestionType;
  options?: string[];
  answer?: string;
};

export type CodeChallenge = {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  companyTargets: string[];
  prompt: string;
  starterCode: string;
  expectedSignals: string[];
};

export type AssessmentBundle = {
  basics: AssessmentQuestion[];
  deep: CodeChallenge[];
};

export type StageScores = {
  cheatingScore?: number;
  stage1: number;
  stage2: number;
  total: number;
};

export type LearningResource = {
  title: string;
  provider: string;
  duration: string;
  href: string;
  skill: string;
};

export type InternshipMatch = {
  id: string;
  title: string;
  company: string;
  location: string;
  mode: "Local" | "Remote" | "Hybrid";
  stipend: string;
  matchScore: number;
  skills: string[];
  applyUrl: string;
  trustBadge: string;
};

export type WizardResults = {
  cheatingScore?: number;
  analytics?: any;
  scores: StageScores;
  skillGaps: SkillGap[];
  resources: LearningResource[];
  matches: InternshipMatch[];
  trustAssessment?: {
    trustScore: number;
    trustLevel: string;
    breakdown?: Record<string, number>;
    recommendations?: string[];
  };
  resumeImprover?: {
    atsScore?: number;
    missingKeywords?: string[];
    tips?: string[];
    suggestions?: Array<{
      section: string;
      current_issue: string;
      improvement: string;
      priority: string;
    }>;
  };
};

export type OnboardingProfile = {
  location: string;
  preferredSector: string;
  education: string;
  githubUrl?: string;
  linkedinUrl?: string;
  email?: string;
  targetRole?: string;
};
