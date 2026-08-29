export interface DepartmentRouting {
  local_departments: string[];
  cpgrams_categories: string[];
}

const ROUTING_RULES: Array<{
  pattern: RegExp;
  local: string[];
  central: string[];
}> = [
  {
    pattern: /pothole|potholes|road\b|roads\b|asphalt|tar\b|footpath|pavement|crater|speed bump/i,
    local: ["BBMP Roads & Infrastructure"],
    central: ["Ministry of Road Transport and Highways"],
  },
  {
    pattern: /drain|drainage|stormwater|storm water|flood|flooding|sewage|nala|manhole|overflow/i,
    local: ["BBMP Storm Water Drains"],
    central: ["Ministry of Jal Shakti"],
  },
  {
    pattern: /streetlight|street light|streetlights|street lamp|lamp post|lighting|dark area|bescom|power cut|electricity|live wire/i,
    local: ["BBMP Electrical", "BESCOM"],
    central: ["Ministry of Power"],
  },
  {
    pattern: /water\b|pipe|leak|burst|bwssb|sewerage|tap\b|supply cut/i,
    local: ["BWSSB Water Supply"],
    central: ["Ministry of Housing and Urban Affairs"],
  },
  {
    pattern: /garbage|waste|sanitation|dump|litter|blackspot|sweep/i,
    local: ["BBMP Solid Waste Management"],
    central: ["Ministry of Housing and Urban Affairs"],
  },
  {
    pattern: /park|garden|tree|green|playground/i,
    local: ["BBMP Horticulture"],
    central: ["Ministry of Housing and Urban Affairs"],
  },
  {
    pattern: /noise|pollution|smoke|dust/i,
    local: ["BBMP Environment & Health"],
    central: ["Ministry of Environment, Forest and Climate Change"],
  },
];

export function detectDepartmentsFromText(text: string): DepartmentRouting {
  const local = new Set<string>();
  const central = new Set<string>();

  for (const rule of ROUTING_RULES) {
    if (rule.pattern.test(text)) {
      rule.local.forEach((d) => local.add(d));
      rule.central.forEach((c) => central.add(c));
    }
  }

  if (local.size === 0) {
    local.add("BBMP General Services");
    central.add("Ministry of Housing and Urban Affairs");
  }

  return {
    local_departments: Array.from(local),
    cpgrams_categories: Array.from(central),
  };
}

export function mergeDepartmentRouting(
  raw: {
    local_department?: string;
    cpgrams_category?: string;
    local_departments?: string[];
    cpgrams_categories?: string[];
  },
  citizenText: string
): {
  local_department: string;
  cpgrams_category: string;
  local_departments: string[];
  cpgrams_categories: string[];
} {
  const detected = detectDepartmentsFromText(citizenText);
  const local = new Set<string>();
  const central = new Set<string>();

  if (raw.local_department?.trim()) local.add(raw.local_department.trim());
  if (raw.cpgrams_category?.trim()) central.add(raw.cpgrams_category.trim());
  raw.local_departments?.forEach((d) => d?.trim() && local.add(d.trim()));
  raw.cpgrams_categories?.forEach((c) => c?.trim() && central.add(c.trim()));
  detected.local_departments.forEach((d) => local.add(d));
  detected.cpgrams_categories.forEach((c) => central.add(c));

  const local_departments = Array.from(local);
  const cpgrams_categories = Array.from(central);

  return {
    local_departments,
    cpgrams_categories,
    local_department: local_departments[0] || "BBMP General Services",
    cpgrams_category: cpgrams_categories[0] || "Ministry of Housing and Urban Affairs",
  };
}
