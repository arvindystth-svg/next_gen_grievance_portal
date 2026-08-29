export interface DepartmentRouting {
  local_department: string;
  local_departments: string[];
  cpgrams_category: string;
  cpgrams_categories: string[];
  matched_topics: string[];
}

interface RoutingRule {
  id: string;
  topic: string;
  patterns: RegExp[];
  local: string[];
  central: string[];
  priority: number; // lower = higher priority for primary routing
}

/**
 * Deterministic BBMP/BWSSB/BESCOM routing rules.
 * Keyword matching is authoritative — AI suggestions are NOT used for departments.
 */
const ROUTING_RULES: RoutingRule[] = [
  {
    id: "roads",
    topic: "Roads & Traffic Infrastructure",
    priority: 10,
    patterns: [
      /\bspeed\s*breakers?\b/i,
      /\bspeed\s*brakers?\b/i, // common typo
      /\bspeed\s*bumps?\b/i,
      /\broad\s*humps?\b/i,
      /\brumble\s*strips?\b/i,
      /\btraffic\s*calming\b/i,
      /\bpotholes?\b/i,
      /\broads?\b/i,
      /\bfootpaths?\b/i,
      /\bpavements?\b/i,
      /\basphalt\b/i,
      /\bbitumen\b/i,
      /\bmedian\b/i,
      /\bzebra\s*crossing\b/i,
      /\btraffic\s*signal\b/i,
      /\broad\s*repair\b/i,
      /\broad\s*damage\b/i,
      /\bcrater\b/i,
      /\buneven\s*road\b/i,
      /\bbroken\s*road\b/i,
    ],
    local: ["BBMP Roads & Infrastructure"],
    central: ["Ministry of Road Transport and Highways"],
  },
  {
    id: "drainage",
    topic: "Stormwater & Drainage",
    priority: 15,
    patterns: [
      /\bdrainage\b/i,
      /\bstorm\s*water\b/i,
      /\bstormwater\b/i,
      /\bdrains?\b/i,
      /\bnala\b/i,
      /\bmanholes?\b/i,
      /\bsewage\b/i,
      /\bflooding\b/i,
      /\bflood\b/i,
      /\bwater\s*logging\b/i,
      /\bwaterlogged\b/i,
      /\boverflow\b/i,
      /\bblock(ed)?\s*drain\b/i,
      /\bclogged\s*drain\b/i,
    ],
    local: ["BBMP Storm Water Drains"],
    central: ["Ministry of Jal Shakti"],
  },
  {
    id: "streetlights",
    topic: "Street Lighting & Power",
    priority: 20,
    patterns: [
      /\bstreet\s*lights?\b/i,
      /\bstreetlights?\b/i,
      /\bstreet\s*lamps?\b/i,
      /\blamp\s*posts?\b/i,
      /\bstreet\s*lighting\b/i,
      /\bdark\s+(street|road|area|stretch)\b/i,
      /\bnon[\s-]?functional\s+lights?\b/i,
      /\bbroken\s+lights?\b/i,
      /\bbescom\b/i,
      /\bpower\s*(cut|outage|failure)\b/i,
      /\belectricity\s*(cut|outage|failure)\b/i,
      /\blive\s*wire\b/i,
      /\bexposed\s*wire\b/i,
    ],
    local: ["BBMP Electrical", "BESCOM"],
    central: ["Ministry of Power"],
  },
  {
    id: "water",
    topic: "Water Supply",
    priority: 12,
    patterns: [
      /\bbwssb\b/i,
      /\bwater\s*supply\b/i,
      /\bwater\s*main\b/i,
      /\bpipe\s*burst\b/i,
      /\bwater\s*leak\b/i,
      /\bno\s*water\b/i,
      /\bwater\s*cut\b/i,
      /\btap\s*water\b/i,
      /\bdrinking\s*water\b/i,
      /\bsewerage\b/i,
      /\blow\s*pressure\b/i,
    ],
    local: ["BWSSB Water Supply"],
    central: ["Ministry of Housing and Urban Affairs"],
  },
  {
    id: "sanitation",
    topic: "Solid Waste & Sanitation",
    priority: 25,
    patterns: [
      /\bgarbage\b/i,
      /\bsolid\s*waste\b/i,
      /\btrash\b/i,
      /\blitter\b/i,
      /\bblack\s*spot\b/i,
      /\bblackspot\b/i,
      /\buncollected\s*waste\b/i,
      /\bsanitation\b/i,
      /\bdump\b/i,
      /\boverflowing\s*bin\b/i,
      /\bstreet\s*sweeping\b/i,
    ],
    local: ["BBMP Solid Waste Management"],
    central: ["Ministry of Housing and Urban Affairs"],
  },
  {
    id: "horticulture",
    topic: "Parks & Horticulture",
    priority: 40,
    patterns: [
      /\bpark\b/i,
      /\bplayground\b/i,
      /\bgarden\b/i,
      /\bhorticulture\b/i,
      /\btree\s*(fall|fallen|pruning|branch)\b/i,
      /\bfallen\s*tree\b/i,
      /\bpruning\b/i,
      /\blandscaping\b/i,
      /\bgrass\s*cutting\b/i,
      /\bpublic\s*park\b/i,
    ],
    local: ["BBMP Horticulture"],
    central: ["Ministry of Housing and Urban Affairs"],
  },
  {
    id: "environment",
    topic: "Pollution & Environment",
    priority: 45,
    patterns: [
      /\bnoise\s*pollution\b/i,
      /\bair\s*pollution\b/i,
      /\bconstruction\s*dust\b/i,
      /\bindustrial\s*smoke\b/i,
      /\bstench\b/i,
      /\bfoul\s*smell\b/i,
    ],
    local: ["BBMP Environment & Health"],
    central: ["Ministry of Environment, Forest and Climate Change"],
  },
  {
    id: "building",
    topic: "Building & Encroachment",
    priority: 35,
    patterns: [
      /\bencroachment\b/i,
      /\billegal\s*construction\b/i,
      /\bunauthorized\s*building\b/i,
      /\bbuilding\s*plan\b/i,
    ],
    local: ["BBMP Building & Encroachment"],
    central: ["Ministry of Housing and Urban Affairs"],
  },
];

export function detectDepartmentsFromText(text: string): DepartmentRouting {
  const local = new Set<string>();
  const central = new Set<string>();
  const matchedTopics: string[] = [];
  let bestPriority = Infinity;
  let primaryLocal = "BBMP General Services";
  let primaryCentral = "Ministry of Housing and Urban Affairs";

  for (const rule of ROUTING_RULES) {
    const hit = rule.patterns.some((p) => p.test(text));
    if (!hit) continue;

    matchedTopics.push(rule.topic);
    rule.local.forEach((d) => local.add(d));
    rule.central.forEach((c) => central.add(c));

    if (rule.priority < bestPriority) {
      bestPriority = rule.priority;
      primaryLocal = rule.local[0];
      primaryCentral = rule.central[0];
    }
  }

  if (local.size === 0) {
    local.add("BBMP General Services");
    central.add("Ministry of Housing and Urban Affairs");
    matchedTopics.push("General Civic Services");
  }

  const local_departments = Array.from(local);
  const cpgrams_categories = Array.from(central);

  return {
    local_department: primaryLocal,
    local_departments,
    cpgrams_category: primaryCentral,
    cpgrams_categories,
    matched_topics: matchedTopics,
  };
}

/**
 * Resolve routing from citizen text only.
 * AI department fields are intentionally ignored to prevent hallucinated tags.
 */
export function resolveDepartmentRouting(citizenText: string): DepartmentRouting {
  return detectDepartmentsFromText(citizenText);
}
