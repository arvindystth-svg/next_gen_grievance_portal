import { resolveDepartmentRouting, DepartmentRouting } from "@/lib/departmentDetection";

const CIVIC_KEYWORD_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "pothole", pattern: /\bpotholes?\b/i },
  { label: "speed breaker", pattern: /\bspeed\s*breakers?\b/i },
  { label: "drainage", pattern: /\bdrainage\b/i },
  { label: "flooding", pattern: /\bflooding?\b/i },
  { label: "street light", pattern: /\bstreet\s*lights?\b/i },
  { label: "water supply", pattern: /\bwater\s*supply\b/i },
  { label: "garbage", pattern: /\bgarbage\b/i },
  { label: "BWSSB", pattern: /\bbwssb\b/i },
  { label: "BESCOM", pattern: /\bbescom\b/i },
  { label: "encroachment", pattern: /\bencroachment\b/i },
  { label: "tree fall", pattern: /\bfallen\s*tree\b/i },
  { label: "pollution", pattern: /\bpollution\b/i },
];

function extractKeywords(text: string, routing: DepartmentRouting): string[] {
  const keywords = new Set<string>();

  for (const { label, pattern } of CIVIC_KEYWORD_PATTERNS) {
    if (pattern.test(text)) keywords.add(label);
  }

  for (const topic of routing.matched_topics) {
    topic
      .split(/[&/,]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 2 && part !== "and")
      .forEach((part) => keywords.add(part));
  }

  return Array.from(keywords).slice(0, 10);
}

export interface SummaryRoutingResult {
  localDepartments: string[];
  cpgramsCategories: string[];
  keywords: string[];
  matchedTopics: string[];
}

/** Re-derive department tags and keywords when the citizen edits the AI summary. */
export function rerouteFromSummary(summary: string): SummaryRoutingResult {
  const routing = resolveDepartmentRouting(summary);
  return {
    localDepartments: routing.local_departments,
    cpgramsCategories: routing.cpgrams_categories,
    keywords: extractKeywords(summary, routing),
    matchedTopics: routing.matched_topics,
  };
}
