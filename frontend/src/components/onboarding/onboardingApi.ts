import type {
  AssessmentBundle,
  InternshipMatch,
  LearningResource,
  OnboardingProfile,
  SkillGap,
} from "./types";

const apiBaseCandidates = Array.from(
  new Set(
    [import.meta.env.VITE_API_BASE_URL, "http://localhost:8000", "http://localhost:8001"].filter(Boolean),
  ),
);

const skillBank = [
  "Python",
  "SQL",
  "MS Excel",
  "React",
  "Communication",
  "Customer Service",
  "Data Entry",
  "Machine Learning",
  "Power BI",
  "Field Work",
  "Accounting",
  "Sales",
  "Research",
  "Teaching",
  "HTML",
  "CSS",
  "JavaScript",
];

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  let lastError: unknown = null;

  for (const baseUrl of apiBaseCandidates) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        lastError = new Error(`API returned ${response.status}`);
        continue;
      }

      return (await response.json()) as TResponse;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function postForm<TResponse>(path: string, formData: FormData): Promise<TResponse> {
  let lastError: unknown = null;

  for (const baseUrl of apiBaseCandidates) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        lastError = new Error(`API returned ${response.status}`);
        continue;
      }

      return (await response.json()) as TResponse;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function parseResumeWithOcr(file: File): Promise<string[]> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("location", "India");
  formData.append("education", "Graduate");
  formData.append("preferred_sector", "Any");

  try {
    const response = await postForm<{ extracted_skills?: string[]; skills?: string[] }>("/analyze-resume", formData);
    const skills = response.extracted_skills || response.skills || [];
    if (skills.length) return skills;
  } catch {
    await sleep(850);
  }

  return ["Python", "MS Excel", "Communication", "Data Analysis", "SQL"];
}

export async function generateAssessmentBundle(skills: string[]): Promise<AssessmentBundle> {
  const normalized = skills.length ? skills : ["Communication", "MS Excel", "Problem Solving"];

  try {
    const response = await postJson<{
      assessment_quiz?: Array<{ q?: string; question?: string; options?: string[] | string; a?: string }>;
    }>("/manual-profile", {
      education: "Graduate",
      location: "India",
      preferred_sector: "Any",
      manual_skills: normalized,
    });

    const basics = (response.assessment_quiz || []).slice(0, 5).map((item, index) => {
      const rawOptions = item.options || [];
      const options = Array.isArray(rawOptions)
        ? rawOptions
        : String(rawOptions)
            .split(/\s{2,}|(?<=\.)\s+(?=[A-Z])/)
            .filter(Boolean);

      return {
        id: `backend-basic-${index + 1}`,
        skill: normalized[index % normalized.length],
        prompt: item.q || item.question || `Explain ${normalized[index % normalized.length]} in a work scenario.`,
        type: options.length >= 2 ? ("mcq" as const) : ("short" as const),
        options: options.length >= 2 ? options.slice(0, 4) : undefined,
        answer: item.a,
      };
    });

    if (basics.length >= 5) {
      return {
        basics,
        deep: createMockDeepChallenges(normalized),
      };
    }
  } catch {
    await sleep(500);
  }

  return {
    basics: createMockBasicQuestions(normalized),
    deep: createMockDeepChallenges(normalized),
  };
}

export async function fetchInternshipMatches(
  skills: string[],
  profile: OnboardingProfile,
): Promise<InternshipMatch[]> {
  try {
    const response = await postJson<{
      top_matches?: Array<Record<string, unknown>>;
    }>("/recommended-jobs", {
      skills,
      location: profile.location || "India",
      education: profile.education || "Graduate",
      preferred_sector: profile.preferredSector || "Any",
      target_language: "English",
      lang: "en",
    });

    const matches = (response.top_matches || []).map((job, index) => ({
      id: String(job.id || `backend-match-${index + 1}`),
      title: String(job.title || "Verified Internship"),
      company: String(job.company || "Verified Local Employer"),
      location: String(job.location || profile.location || "India"),
      mode: inferMode(String(job.location || "")),
      stipend: String(job.stipend || "Rs 10k - 18k/mo"),
      matchScore: Number(job.match_score || 78),
      skills: Array.isArray(job.matched_skills)
        ? (job.matched_skills as string[])
        : Array.isArray(job.skills)
          ? (job.skills as string[])
          : skills.slice(0, 3),
      applyUrl: String(job.apply_url || "https://pminternship.mca.gov.in/"),
      trustBadge: "Verified employer",
    }));

    if (matches.length) return matches;
  } catch {
    await sleep(500);
  }

  return createMockMatches(skills, profile);
}

export function createSkillGaps(skills: string[], stage1Score: number, stage2Score: number): SkillGap[] {
  const firstSkill = skills[0] || "Communication";
  const secondSkill = skills[1] || "Problem Solving";
  const thirdSkill = skills[2] || "MS Excel";

  const gaps: SkillGap[] = [];
  if (stage1Score < 70) {
    gaps.push({
      skill: firstSkill,
      reason: "Conceptual basics need stronger interview-level clarity.",
      priority: "High",
    });
  }
  if (stage2Score < 70) {
    gaps.push({
      skill: secondSkill,
      reason: "Deep theory and implementation confidence should improve before matching.",
      priority: "High",
    });
  }
  if (!gaps.length && stage1Score < 85) {
    gaps.push({
      skill: thirdSkill,
      reason: "A short revision sprint can increase the trust score.",
      priority: "Medium",
    });
  }

  return gaps;
}

export function createLearningResources(gaps: SkillGap[]): LearningResource[] {
  const activeGaps = gaps.length
    ? gaps
    : [{ skill: "Interview Readiness", reason: "Recommended polish before applying.", priority: "Low" as const }];

  return activeGaps.map((gap, index) => ({
    title: `${gap.skill} job-ready sprint`,
    provider: ["NPTEL", "Coursera", "Google Skillshop"][index % 3],
    duration: ["2 hours", "1 week", "3 modules"][index % 3],
    href: "https://www.coursera.org/",
    skill: gap.skill,
  }));
}

export function skillSuggestions(query: string, selected: string[]): string[] {
  const needle = query.trim().toLowerCase();
  return skillBank
    .filter((skill) => !selected.some((item) => item.toLowerCase() === skill.toLowerCase()))
    .filter((skill) => !needle || skill.toLowerCase().includes(needle))
    .slice(0, 7);
}

function createMockBasicQuestions(skills: string[]) {
  return Array.from({ length: 5 }, (_, index) => {
    const skill = skills[index % skills.length] || "Communication";
    return {
      id: `basic-${index + 1}`,
      skill,
      prompt: `Which answer best proves that a candidate can use ${skill} in a real internship task?`,
      type: "mcq" as const,
      options: [
        `Use ${skill} carefully and explain the result`,
        "Skip validation and submit quickly",
        "Wait for the manager to solve it",
        "Avoid documenting the work",
      ],
      answer: `Use ${skill} carefully and explain the result`,
    };
  });
}

function createMockDeepChallenges(skills: string[]) {
  const primarySkill = skills.find((skill) => /python|java|javascript|sql|data/i.test(skill)) || skills[0] || "Python";
  return [
    {
      id: "deep-1",
      title: `Trust-score filter using ${primarySkill}`,
      difficulty: "Medium" as const,
      companyTargets: ["Meta", "Amazon", "TCS"],
      prompt:
        "Given an array of candidate trust scores, write a function that returns only candidates above a threshold and keeps their original order. Add a short note about time complexity.",
      starterCode:
        "function filterTrustedCandidates(candidates, threshold) {\n  // candidates: [{ name: string, score: number }]\n  return [];\n}\n",
      expectedSignals: ["filter", "return", "score", "threshold"],
    },
  ];
}

function createMockMatches(skills: string[], profile: OnboardingProfile): InternshipMatch[] {
  const location = profile.location || "Hyderabad";
  return [
    {
      id: "local-1",
      title: "Resume Verification Operations Intern",
      company: "BharatJobs Local Hub",
      location,
      mode: "Local",
      stipend: "Rs 12k/mo",
      matchScore: 92,
      skills: skills.slice(0, 3),
      applyUrl: "https://pminternship.mca.gov.in/",
      trustBadge: "Verified local employer",
    },
    {
      id: "remote-1",
      title: "Data Quality Intern",
      company: "SkillProof AI",
      location: "Remote",
      mode: "Remote",
      stipend: "Rs 18k/mo",
      matchScore: 87,
      skills: skills.slice(0, 4),
      applyUrl: "https://pminternship.mca.gov.in/",
      trustBadge: "Remote verified",
    },
    {
      id: "hybrid-1",
      title: "Candidate Support Associate Intern",
      company: "CareerSetu",
      location: `${location} + Remote`,
      mode: "Hybrid",
      stipend: "Rs 10k - 15k/mo",
      matchScore: 83,
      skills: skills.slice(0, 3),
      applyUrl: "https://pminternship.mca.gov.in/",
      trustBadge: "Interview fast-track",
    },
  ];
}

function inferMode(location: string): "Local" | "Remote" | "Hybrid" {
  const lowered = location.toLowerCase();
  if (lowered.includes("remote")) return "Remote";
  if (lowered.includes("+") || lowered.includes("hybrid")) return "Hybrid";
  return "Local";
}
