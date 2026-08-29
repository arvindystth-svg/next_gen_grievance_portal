/** All routable local departments for Bengaluru civic services */
export const LOCAL_DEPARTMENTS: string[] = [
  "BBMP Building & Encroachment",
  "BBMP Electrical",
  "BBMP Environment & Health",
  "BBMP General Services",
  "BBMP Horticulture",
  "BBMP Roads & Infrastructure",
  "BBMP Solid Waste Management",
  "BBMP Storm Water Drains",
  "BESCOM",
  "BWSSB Water Supply",
];

/** Central CPGRAMS ministry categories */
export const CPGRAMS_MINISTRIES: string[] = [
  "Ministry of Environment, Forest and Climate Change",
  "Ministry of Housing and Urban Affairs",
  "Ministry of Jal Shakti",
  "Ministry of Power",
  "Ministry of Road Transport and Highways",
];

/** Suggested CPGRAMS mapping when a local department is selected */
export const LOCAL_TO_CPGRAMS: Record<string, string> = {
  "BBMP Roads & Infrastructure": "Ministry of Road Transport and Highways",
  "BBMP Storm Water Drains": "Ministry of Jal Shakti",
  "BBMP Electrical": "Ministry of Power",
  BESCOM: "Ministry of Power",
  "BWSSB Water Supply": "Ministry of Housing and Urban Affairs",
  "BBMP Solid Waste Management": "Ministry of Housing and Urban Affairs",
  "BBMP Horticulture": "Ministry of Housing and Urban Affairs",
  "BBMP Environment & Health": "Ministry of Environment, Forest and Climate Change",
  "BBMP Building & Encroachment": "Ministry of Housing and Urban Affairs",
  "BBMP General Services": "Ministry of Housing and Urban Affairs",
};

export function cpgramsForLocalDepartments(localDepts: string[]): string[] {
  const ministries = new Set<string>();
  for (const dept of localDepts) {
    const ministry = LOCAL_TO_CPGRAMS[dept];
    if (ministry) ministries.add(ministry);
  }
  return Array.from(ministries);
}
