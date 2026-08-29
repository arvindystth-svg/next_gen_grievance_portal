export interface CompletenessField {
  id: string;
  label: string;
  fillHint: string;
  completed: boolean;
  weight: number;
}

export interface CompletenessReport {
  score: number;
  fields: CompletenessField[];
  missing: CompletenessField[];
  completed: CompletenessField[];
}

interface LocationInput {
  lat: number;
  lng: number;
  ward?: string;
  zone?: string;
  locality?: string;
  source?: string;
}

interface AssessParams {
  grievanceText: string;
  editedSummary: string;
  location: LocationInput | null;
  selectedLocalDepartments: string[];
  aiObservation?: string;
  aiMissing?: boolean;
}

const LANDMARK_PATTERNS = [
  /\b(near|opposite|behind|beside|next to|adjacent)\b/i,
  /\b(bus stand|metro|hospital|school|temple|mall|junction|circle|chowk)\b/i,
  /\b\d+(st|nd|rd|th)\s+(main|cross|block|stage)\b/i,
  /\bmain\s+road\b/i,
  /\bstreet\s*(no\.?|number)?\s*\d+/i,
  /\bplot\s*(no\.?|#)?\s*\d+/i,
];

const TIMELINE_PATTERNS = [
  /\b(since|for|past|last)\s+\d+\s+(day|week|month|hour)/i,
  /\b\d+\s+(days?|weeks?|months?)\s+(ago|back)/i,
  /\b(yesterday|today|this\s+morning|last\s+night)\b/i,
  /\bstarted\s+on\b/i,
];

const CONSUMER_ID_PATTERNS = [
  /\bconsumer\s*(id|no\.?|number)\b/i,
  /\brr\s*(no\.?|number)\b/i,
  /\baccount\s*(no\.?|number)\b/i,
  /\bconnection\s*(id|no\.?|number)\b/i,
  /\b(meter|rr)\s*[#:]?\s*\d{4,}/i,
];

function combinedText(grievanceText: string, editedSummary: string): string {
  return `${grievanceText}\n${editedSummary}`.toLowerCase();
}

function hasLandmark(text: string): boolean {
  return LANDMARK_PATTERNS.some((p) => p.test(text));
}

function hasTimeline(text: string): boolean {
  return TIMELINE_PATTERNS.some((p) => p.test(text));
}

function hasConsumerId(text: string): boolean {
  return CONSUMER_ID_PATTERNS.some((p) => p.test(text));
}

function needsUtilityId(departments: string[]): boolean {
  return departments.some(
    (d) =>
      d.includes("BWSSB") || d.includes("BESCOM") || d.includes("Electrical")
  );
}

function wardConfirmed(location: LocationInput | null): boolean {
  if (!location?.ward) return false;
  const w = location.ward.toLowerCase();
  return !w.includes("to be confirmed") && !w.includes("unknown");
}

export function assessComplaintCompleteness(params: AssessParams): CompletenessReport {
  const text = combinedText(params.grievanceText, params.editedSummary);
  const fields: CompletenessField[] = [];

  fields.push({
    id: "description",
    label: "Issue description",
    fillHint: "Describe what is wrong, how it affects you, and any safety concerns in Step 1.",
    completed: params.grievanceText.trim().length >= 20,
    weight: 20,
  });

  fields.push({
    id: "location",
    label: "Pinned map location",
    fillHint: "Pin the issue on the map in the review step using GPS, photo EXIF, or by dragging the marker.",
    completed: Boolean(params.location?.lat && params.location?.lng),
    weight: 20,
  });

  fields.push({
    id: "ward",
    label: "Ward & locality",
    fillHint: "Confirm ward and locality by pinning the location on the map in the review step.",
    completed: wardConfirmed(params.location),
    weight: 15,
  });

  const landmarkFromText = hasLandmark(text);
  fields.push({
    id: "landmark",
    label: "Landmark or street address",
    fillHint:
      params.aiObservation && params.aiMissing
        ? params.aiObservation
        : "Add a nearby landmark (temple, school, bus stop, hospital) or street name in your description or summary.",
    completed: landmarkFromText || params.aiMissing === false,
    weight: 15,
  });

  fields.push({
    id: "timeline",
    label: "When the issue started",
    fillHint: "Mention how long the problem has lasted (e.g. 'for 3 days' or 'since Monday morning').",
    completed: hasTimeline(text),
    weight: 10,
  });

  fields.push({
    id: "departments",
    label: "Department routing",
    fillHint: "Confirm or correct the routed departments in the review step so your ticket reaches the right team.",
    completed: params.selectedLocalDepartments.length > 0,
    weight: 10,
  });

  const utilityNeeded = needsUtilityId(params.selectedLocalDepartments);
  fields.push({
    id: "consumer_id",
    label: "Utility consumer / RR number",
    fillHint:
      "For water or power complaints, add your BWSSB/BESCOM consumer ID or RR number in the summary.",
    completed: !utilityNeeded || hasConsumerId(text),
    weight: 10,
  });

  const completed = fields.filter((f) => f.completed);
  const missing = fields.filter((f) => !f.completed);
  const score = Math.round(
    fields.reduce((sum, f) => sum + (f.completed ? f.weight : 0), 0)
  );

  return { score, fields, missing, completed };
}
