import type {
  AssessmentBundle,
  AssessmentQuestion,
  CodeChallenge,
  InternshipMatch,
  LearningResource,
  OnboardingProfile,
  QuestionType,
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

const normalizeExternalUrl = (
  value: string | undefined | null,
  fallback = "https://www.coursera.org/",
) => {
  const raw = String(value || "").trim();
  if (!raw) return fallback;

  const maybeAbsolute = (() => {
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;
    if (/^www\./i.test(raw)) return `https://${raw}`;
    if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(raw)) return `https://${raw}`;
    return "";
  })();

  try {
    const parsed = new URL(maybeAbsolute || raw);
    if (!["http:", "https:"].includes(parsed.protocol)) return fallback;
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname.toLowerCase())) return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
};

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

export async function parseResumeWithOcr(file: File): Promise<{ skills: string[]; resumeText: string; githubUrl?: string; linkedinUrl?: string; email?: string; }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("location", "India");
  formData.append("education", "Graduate");
  formData.append("preferred_sector", "Any");

  try {
    const response = await postForm<{ extracted_skills?: string[]; skills?: string[]; resume_text?: string; github_url?: string; linkedin_url?: string; email?: string }>("/analyze-resume", formData);
    const skills = response.extracted_skills || response.skills || [];
    if (skills.length) return { 
      skills, 
      resumeText: String(response.resume_text || ""),
      githubUrl: response.github_url || undefined,
      linkedinUrl: response.linkedin_url || undefined,
      email: response.email || undefined,
    };
  } catch {
    await sleep(850);
  }

  return {
    skills: ["Python", "MS Excel", "Communication", "Data Analysis", "SQL"],
    resumeText: "",
  };
}

export async function generateAssessmentBundle(skills: string[]): Promise<AssessmentBundle> {
  const normalized = skills.length ? skills : ["Communication", "MS Excel", "Problem Solving"];

  try {
    const [t1Response, t2Response] = await Promise.all([
      postJson<{ questions?: any[] }>("/generate-test-1", { skills: normalized }),
      postJson<{ challenges?: any[] }>("/generate-test-2", { skills: normalized }),
    ]);

    const basics: AssessmentQuestion[] = (t1Response.questions || []).map((q: any) => ({
      id: String(q.id || Math.random().toString()),
      skill: String(q.skill || normalized[0]),
      prompt: String(q.prompt || ""),
      type: (q.options && q.options.length > 0 ? "mcq" : "short") as QuestionType,
      options: Array.isArray(q.options) ? q.options.map(String) : undefined,
      answer: q.answer ? String(q.answer) : undefined
    }));

    const deep: CodeChallenge[] = (t2Response.challenges || []).map((c: any) => ({
      id: String(c.id || Math.random().toString()),
      title: String(c.title || "Coding Challenge"),
      difficulty: (c.difficulty || "Medium") as "Easy" | "Medium" | "Hard",
      companyTargets: Array.isArray(c.companyTargets) ? c.companyTargets.map(String) : ["Tech Co"],
      prompt: String(c.prompt || ""),
      starterCode: String(c.starterCode || ""),
      expectedSignals: Array.isArray(c.expectedSignals) ? c.expectedSignals.map(String) : []
    }));

    if (basics.length > 0) {
      return { basics, deep };
    }
  } catch (err) {
    console.error("Test generation failed:", err);
    await sleep(500);
  }

  return {
    basics: createMockBasicQuestions(normalized),
    deep: createMockDeepChallenges(normalized),
  };
}

export async function executeCode(code: string, language: string): Promise<{ stdout: string; stderr: string; error: boolean }> {
  try {
    return await postJson<{ stdout: string; stderr: string; error: boolean }>("/execute-code", { code, language });
  } catch (err) {
    return { stdout: "", stderr: String(err), error: true };
  }
}

export async function calculateCheatingScore(data: { tabSwitches: number; copyPasteCount: number; timeTakenSeconds: number }): Promise<number> {
  try {
    const res = await postJson<{ cheating_score: number }>("/calculate-cheating-score", {
      tab_switches: data.tabSwitches,
      copy_paste_count: data.copyPasteCount,
      time_taken_seconds: data.timeTakenSeconds,
    });
    return res.cheating_score || 0;
  } catch (err) {
    return 0;
  }
}

export async function generateAnalytics(skills: string[], totalScore: number, cheatingScore: number): Promise<{ overall_score: number; skill_scores: Record<string, number>; strengths: string[]; weaknesses: string[] }> {
  try {
    return await postJson<{ overall_score: number; skill_scores: Record<string, number>; strengths: string[]; weaknesses: string[] }>("/generate-analytics", {
      skills,
      total_score: totalScore,
      cheating_score: cheatingScore,
    });
  } catch (err) {
    return {
      overall_score: totalScore,
      skill_scores: {},
      strengths: ["Technical Foundation"],
      weaknesses: ["Advanced Implementation"]
    };
  }
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
      applyUrl: normalizeExternalUrl(String(job.apply_url || ""), "https://pminternship.mca.gov.in/"),
      trustBadge: "Verified employer",
    }));

    if (matches.length) return matches;
  } catch {
    await sleep(500);
  }

  return createMockMatches(skills, profile);
}

export function createSkillGaps(skills: string[], stage1Score: number, stage2Score: number): SkillGap[] {
  const gaps: SkillGap[] = [];
  
  skills.forEach((skill, index) => {
    if (index === 0 && stage1Score < 70) {
      gaps.push({
        skill,
        reason: "Conceptual basics need stronger interview-level clarity.",
        priority: "High",
      });
    } else if (index === 1 && stage2Score < 70) {
      gaps.push({
        skill,
        reason: "Deep theory and implementation confidence should improve before matching.",
        priority: "High",
      });
    } else if (stage1Score < 85 && index < 4) {
      gaps.push({
        skill,
        reason: "A short revision sprint can increase the trust score.",
        priority: "Medium",
      });
    }
  });

  if (!gaps.length) {
    gaps.push({
      skill: skills[0] || "Interview Readiness",
      reason: "A short revision sprint can increase the trust score.",
      priority: "Medium",
    });
  }

  return gaps;
}

export async function fetchCourseRecommendations(skills: string[], weakSkills: string[]): Promise<LearningResource[]> {
  try {
    const res = await postJson<{ courses?: any[] }>("/course-recommendations", {
      skills,
      weak_skills: weakSkills,
    });
    const courses = res.courses || [];
    if (courses.length) {
      return courses.map((c: any) => {
        const fallback = `https://www.youtube.com/results?search_query=learn+${encodeURIComponent(String(c.skill || skills[0] || "internship skill"))}`;
        return {
          title: c.course_name || c.title || `Learn ${c.skill}`,
          provider: c.platform || "Online",
          duration: c.difficulty || "Beginner",
          href: normalizeExternalUrl(c.url_hint, fallback),
          skill: c.skill || skills[0] || "General",
        };
      });
    }
  } catch (err) {
    console.error("Course recommendations failed:", err);
  }

  return createLearningResourcesFallback(skills, weakSkills);
}

export async function computeTrustAssessment(
  profile: OnboardingProfile,
  skills: string[],
  totalScore: number,
  cheatingScore: number,
  resumeText?: string,
): Promise<{
  trustScore: number;
  trustLevel: string;
  breakdown?: Record<string, number>;
  recommendations?: string[];
}> {
  try {
    const res = await postJson<{
      trust_score: number;
      trust_level: string;
      breakdown?: Record<string, number>;
      recommendations?: string[];
    }>("/compute-trust-score", {
      skills,
      assessment_score: totalScore,
      cheating_score: cheatingScore,
      github_url: profile.githubUrl || "",
      linkedin_url: profile.linkedinUrl || "",
      email: profile.email || "",
      resume_text: resumeText || "",
    });

    return {
      trustScore: Number(res.trust_score || totalScore),
      trustLevel: String(res.trust_level || "Moderate"),
      breakdown: res.breakdown || {},
      recommendations: res.recommendations || [],
    };
  } catch (error) {
    return {
      trustScore: totalScore,
      trustLevel: totalScore >= 70 ? "Good" : "Moderate",
      breakdown: {},
      recommendations: [],
    };
  }
}

export async function fetchResumeImprover(
  resumeText: string,
  skills: string[],
  targetRole: string,
): Promise<{
  atsScore?: number;
  missingKeywords?: string[];
  tips?: string[];
  suggestions?: Array<{ section: string; current_issue: string; improvement: string; priority: string }>;
}> {
  if (!resumeText || resumeText.trim().length < 40) {
    return { atsScore: undefined, missingKeywords: [], tips: [], suggestions: [] };
  }

  try {
    const res = await postJson<{
      ats?: { ats_score?: number; missing_keywords?: string[]; tips?: string[] };
      suggestions?: Array<{ section: string; current_issue: string; improvement: string; priority: string }>;
    }>("/resume-improver", {
      resume_text: resumeText,
      skills,
      target_role: targetRole || "PM Internship",
    });

    return {
      atsScore: Number(res.ats?.ats_score || 0),
      missingKeywords: Array.isArray(res.ats?.missing_keywords) ? res.ats?.missing_keywords : [],
      tips: Array.isArray(res.ats?.tips) ? res.ats?.tips : [],
      suggestions: Array.isArray(res.suggestions) ? res.suggestions : [],
    };
  } catch {
    return { atsScore: undefined, missingKeywords: [], tips: [], suggestions: [] };
  }
}

function createLearningResourcesFallback(skills: string[], weakSkills: string[]): LearningResource[] {
  const targets = weakSkills.length ? weakSkills : skills;
  return targets.slice(0, 5).map((skill, index) => ({
    title: `${skill} job-ready sprint`,
    provider: ["NPTEL", "Coursera", "Google Skillshop", "freeCodeCamp", "Udemy"][index % 5],
    duration: ["2 hours", "1 week", "3 modules", "4 hours", "2 weeks"][index % 5],
    href: `https://www.youtube.com/results?search_query=learn+${encodeURIComponent(skill)}`,
    skill,
  }));
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
  return Array.from({ length: 10 }, (_, index) => {
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
  return [0, 1, 2].map((index) => ({
    id: `deep-${index + 1}`,
    title: `Trust-score filter using ${primarySkill} (${index + 1})`,
    difficulty: "Medium" as const,
    companyTargets: ["Meta", "Amazon", "TCS"],
    prompt:
      "Given an array of candidate trust scores, write a function that returns only candidates above a threshold and keeps their original order. Add a short note about time complexity.",
    starterCode:
      "function filterTrustedCandidates(candidates, threshold) {\n  // candidates: [{ name: string, score: number }]\n  return [];\n}\n",
    expectedSignals: ["filter", "return", "score", "threshold"],
  }));
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
