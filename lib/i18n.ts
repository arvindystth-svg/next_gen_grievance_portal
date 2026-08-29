export type LanguageCode = "en" | "kn" | "hi" | "ta" | "hin";

export const LANGUAGE_OPTIONS: { code: LanguageCode; native: string }[] = [
  { code: "en", native: "English" },
  { code: "kn", native: "ಕನ್ನಡ" },
  { code: "hi", native: "हिंदी" },
  { code: "ta", native: "தமிழ்" },
  { code: "hin", native: "Hinglish" },
];

const en = {
  "app.name": "AI CPGRAMS Local",
  "app.bengaluru": "Bengaluru",
  "app.tagline": "Bruhat Bengaluru Mahanagara Palike",
  "app.online": "Online",
  "app.offline": "Offline",
  "app.helpline": "Helpline",
  "app.govtInitiative": "Govt. of India Initiative",
  "app.zoneCoverage": "BBMP South Zone Coverage",
  "app.privacyTitle": "Privacy notice",
  "app.privacyBody":
    "Your complaint details are stored on this device. We do not display personal identity in the portal. Departments receive only the information needed to resolve your grievance.",
  "app.close": "Close",
  "app.citizen": "Citizen",
  "app.myComplaints": "My Complaints",

  "hero.fileTitle": "File a Civic Grievance",
  "hero.fileSubtitle": "AI-powered routing to BBMP, BWSSB & BESCOM · Bengaluru Municipal Services",
  "hero.historyTitle": "My Complaint History",
  "hero.historySubtitle": "Track status, resolutions, and rate closed complaints",

  "tab.file": "File Complaint",
  "tab.draft": "Draft",
  "tab.history": "My Complaints",

  "hero.draftTitle": "Saved Draft",
  "hero.draftSubtitle": "Resume your in-progress complaint",

  "step.describe": "Describe",
  "step.analyze": "Analyze",
  "step.review": "Review",
  "step.summary": "Summary",
  "step.submit": "Submit",
  "step.goBack": "Go back to {label}",
  "step.waitAnalysis": "Please wait for analysis to finish",

  "describe.title": "Describe Your Grievance",
  "describe.hint": "Type or tap the microphone to speak. Include issue details and any landmarks you know.",
  "describe.continueAnalysis": "Continue to AI Analysis",
  "describe.continueReview": "Continue to Review",
  "describe.backToReview": "Back to Review",
  "describe.skipReanalysis":
    "No changes to your description — you can continue straight to review without re-running AI analysis.",
  "describe.editPrompt": "You returned to edit your complaint. Update your description to refresh the AI summary.",
  "describe.minChars": "Please describe your grievance in at least 10 characters.",

  "draft.restored": "Draft restored",
  "draft.restoredBody": "Your in-progress complaint was saved automatically on {date}. Continue where you left off.",
  "draft.restoredBodyNoDate": "Your in-progress complaint was saved automatically. Continue where you left off.",
  "draft.autofillHint": "Values auto-filled from your complaint can be changed.",
  "draft.empty": "No saved draft. Start filing a complaint — your progress is saved automatically and appears here.",
  "draft.savedTitle": "In-progress complaint",
  "draft.savedAt": "Last saved {date}",
  "draft.step": "Stopped at: {step}",
  "draft.preview": "Complaint preview",
  "draft.noPreview": "No description entered yet",
  "draft.resume": "Resume draft",
  "draft.discard": "Discard",
  "draft.progress": "Steps completed",
  "draft.complaintStep1": "Your complaint (Step 1)",
  "draft.aiSummary": "AI summary",

  "ai.summary": "AI Summary",
  "ai.confident": "{n}% confident",
  "ai.editHint": "Edit to refine — routing and location detection update automatically.",
  "ai.routingUpdated": "Routing updated",
  "ai.detectingWard": "Detecting ward from your complaint…",

  "routing.title": "Classification & Routing",
  "routing.noLocal": "No local department selected",
  "routing.noCentral": "No central ministry selected",
  "routing.updatedFromSummary": "Updated from your summary edits",
  "routing.local": "Local (BBMP / BWSSB / BESCOM)",
  "routing.central": "Central (CPGRAMS)",
  "routing.searchDepts": "Search departments…",
  "routing.searchMinistries": "Search ministries…",

  "completeness.title": "Complaint Completeness",
  "completeness.complete": "Complete",
  "completeness.allDone": "All key details captured — continue to summary.",
  "completeness.fillHint": "Fill missing details below. Values auto-filled from your complaint can be changed.",
  "completeness.allCaptured": "All key details captured",
  "completeness.needs": "Needs: {items}",
  "completeness.someNeeded": "Some details still needed",
  "completeness.missing": "Missing details",
  "completeness.autofilled": "Auto-filled",
  "completeness.autofilledHint": "Auto-filled based on your complaint — change below if incorrect.",
  "completeness.added": "Added",
  "completeness.accepted": "Accepted — completeness updated",
  "completeness.keepTyping": "Keep typing — e.g. {example}",
  "completeness.provided": "Provided ({n})",
  "completeness.goRouting": "Go to routing section",

  "summary.title": "Review before submission",
  "summary.subtitle": "Confirm your complaint, routing, and affected area are correct.",
  "summary.yourComplaint": "Your complaint",
  "summary.aiSummary": "AI summary",
  "summary.departments": "Departments",
  "summary.local": "Local",
  "summary.central": "Central (CPGRAMS)",
  "summary.affectedArea": "Affected area",
  "summary.edit": "Edit",
  "summary.editArea": "Edit area",
  "summary.done": "Done",
  "summary.areaMissing": "Not specified — please add affected area before submitting",
  "summary.areaAutofill": "Auto-filled based on your complaint — tap Edit area if this is incorrect.",

  "action.back": "Back",
  "action.continueSummary": "Continue to Summary",
  "action.submit": "Submit Official Complaint",
  "action.submitting": "Submitting…",
  "action.backDescribe": "Back to Describe",
  "action.backReview": "Back to Review",

  "success.title": "Complaint Submitted Successfully!",
  "success.body":
    "Your grievance has been filed and routed to the appropriate department. Track status anytime under My Complaints.",
  "success.trackTitle": "Track your complaint",
  "success.trackBody": "Open My Complaints to see live status updates on this device.",
  "success.refOptional": "Reference (optional)",
  "success.next": "What happens next:",
  "success.sms": "Status updates will appear in My Complaints on this device.",
  "success.routedLocal": "Routed to local departments:",
  "success.routedCentral": "CPGRAMS ministries notified:",
  "success.timeline": "Response expected within 48–72 hours.",
  "success.download": "Download Receipt",
  "success.viewHistory": "View in My Complaints",
  "success.fileAnother": "File Another Complaint",

  "history.empty": "No complaints filed yet.",
  "history.total": "Total Filed",
  "history.active": "Active",
  "history.resolved": "Resolved",
  "history.rate": "Rate resolution",
  "history.resolution": "Resolution",
  "history.demo": "Sample complaints (demonstration only)",

  "footer.tagline": "AI CPGRAMS Local · BBMP Grievance Portal · Bengaluru, Karnataka",
  "footer.privacy":
    "Grievance data is stored on this device. Handled as per IT Act 2000 & DPDP Act 2023.",
  "footer.helplines": "Civic Helpline: {n1533} · BBMP: {bbmp} · BWSSB: {bwssb}",

  "status.Submitted": "Submitted",
  "status.Under Review": "Under Review",
  "status.Assigned to Field Crew": "Assigned to Field Crew",
  "status.In Progress": "In Progress",
  "status.Resolved": "Resolved",
  "status.Closed": "Closed",
} as const;

export type TranslationKey = keyof typeof en;

type Dict = Record<TranslationKey, string>;

const kn: Dict = {
  ...en,
  "hero.fileTitle": "ನಾಗರಿಕ ದೂರು ದಾಖಲಿಸಿ",
  "hero.fileSubtitle": "BBMP, BWSSB ಮತ್ತು BESCOM ಗೆ AI ಮಾರ್ಗದರ್ಶನ · ಬೆಂಗಳೂರು ನಗರ ಸೇವೆಗಳು",
  "hero.historyTitle": "ನನ್ನ ದೂರು ಇತಿಹಾಸ",
  "hero.historySubtitle": "ಸ್ಥಿತಿ, ಪರಿಹಾರ ಮತ್ತು ಮುಚ್ಚಿದ ದೂರುಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",
  "tab.file": "ದೂರು ದಾಖಲಿಸಿ",
  "tab.draft": "ಕರಡು",
  "tab.history": "ನನ್ನ ದೂರುಗಳು",
  "step.describe": "ವಿವರಿಸಿ",
  "step.analyze": "ವಿಶ್ಲೇಷಣೆ",
  "step.review": "ಪರಿಶೀಲನೆ",
  "step.summary": "ಸಾರಾಂಶ",
  "step.submit": "ಸಲ್ಲಿಸಿ",
  "describe.title": "ನಿಮ್ಮ ದೂರನ್ನು ವಿವರಿಸಿ",
  "describe.hint": "ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಮೈಕ್ ಟ್ಯಾಪ್ ಮಾಡಿ ಮಾತನಾಡಿ. ಸಮಸ್ಯೆ ಮತ್ತು ಲ್ಯಾಂಡ್‌ಮಾರ್ಕ್ ವಿವರಗಳನ್ನು ಸೇರಿಸಿ.",
  "describe.continueAnalysis": "AI ವಿಶ್ಲೇಷಣೆಗೆ ಮುಂದುವರಿಯಿರಿ",
  "describe.continueReview": "ಪರಿಶೀಲನೆಗೆ ಮುಂದುವರಿಯಿರಿ",
  "action.submit": "ಅಧಿಕೃತ ದೂರು ಸಲ್ಲಿಸಿ",
  "action.continueSummary": "ಸಾರಾಂಶಕ್ಕೆ ಮುಂದುವರಿಯಿರಿ",
  "success.title": "ದೂರು ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಸಲಾಗಿದೆ!",
  "routing.title": "ವರ್ಗೀಕರಣ ಮತ್ತು ಮಾರ್ಗದರ್ಶನ",
  "completeness.title": "ದೂರು ಪೂರ್ಣತೆ",
  "app.myComplaints": "ನನ್ನ ದೂರುಗಳು",
  "app.online": "ಆನ್‌ಲೈನ್",
  "app.offline": "ಆಫ್‌ಲೈನ್",
};

const hi: Dict = {
  ...en,
  "hero.fileTitle": "नागरिक शिकायत दर्ज करें",
  "hero.fileSubtitle": "BBMP, BWSSB और BESCOM के लिए AI रूटिंग · बेंगलुरु नगर सेवाएँ",
  "hero.historyTitle": "मेरी शिकायत इतिहास",
  "hero.historySubtitle": "स्थिति, समाधान और बंद शिकायतों को ट्रैक करें",
  "tab.file": "शिकायत दर्ज करें",
  "tab.history": "मेरी शिकायतें",
  "step.describe": "वर्णन",
  "step.analyze": "विश्लेषण",
  "step.review": "समीक्षा",
  "step.summary": "सारांश",
  "step.submit": "जमा करें",
  "describe.title": "अपनी शिकायत का वर्णन करें",
  "describe.hint": "टाइप करें या माइक टैप करके बोलें। समस्या और लैंडमार्क विवरण शामिल करें।",
  "describe.continueAnalysis": "AI विश्लेषण पर जाएँ",
  "describe.continueReview": "समीक्षा पर जाएँ",
  "action.submit": "आधिकारिक शिकायत जमा करें",
  "action.continueSummary": "सारांश पर जाएँ",
  "success.title": "शिकायत सफलतापूर्वक जमा!",
  "routing.title": "वर्गीकरण और रूटिंग",
  "completeness.title": "शिकायत पूर्णता",
  "app.myComplaints": "मेरी शिकायतें",
  "app.online": "ऑनलाइन",
  "app.offline": "ऑफलाइन",
};

const ta: Dict = {
  ...en,
  "hero.fileTitle": "குடிமை புகாரை பதிவு செய்யுங்கள்",
  "hero.fileSubtitle": "BBMP, BWSSB & BESCOM க்கு AI வழிமுறை · பெங்களூരു நகர சேவைகள்",
  "hero.historyTitle": "என் புகார் வரலாறு",
  "hero.historySubtitle": "நிலை, தீர்வு மற்றும் மூடப்பட்ட புகார்களை கண்காணிக்கவும்",
  "tab.file": "புகார் பதிவு",
  "tab.history": "என் புகார்கள்",
  "step.describe": "விவரம்",
  "step.analyze": "பகுப்பாய்வு",
  "step.review": "மதிப்பாய்வு",
  "step.summary": "சுருக்கம்",
  "step.submit": "சமர்ப்பி",
  "describe.title": "உங்கள் புகாரை விவரிக்கவும்",
  "describe.hint": "தட்டச்சு செய்யுங்கள் அல்லது மைக் அழுத்தி பேசுங்கள்.",
  "describe.continueAnalysis": "AI பகுப்பாய்வுக்கு தொடரவும்",
  "describe.continueReview": "மதிப்பாய்வுக்கு தொடரவும்",
  "action.submit": "அதிகாரப்பூர்வ புகார் சமர்ப்பி",
  "action.continueSummary": "சுருக்கத்திற்கு தொடரவும்",
  "success.title": "புகார் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!",
  "routing.title": "வகைப்பாடு & வழிமுறை",
  "completeness.title": "புகார் முழுமை",
  "app.myComplaints": "என் புகார்கள்",
  "app.online": "ஆன்லைன்",
  "app.offline": "ஆஃப்லைன்",
};

const hin: Dict = {
  ...en,
  "hero.fileTitle": "Civic Grievance File Karein",
  "hero.fileSubtitle": "BBMP, BWSSB & BESCOM ke liye AI routing · Bengaluru municipal services",
  "hero.historyTitle": "Meri Complaint History",
  "hero.historySubtitle": "Status, resolution aur closed complaints track karein",
  "tab.file": "Complaint File Karein",
  "tab.history": "Meri Complaints",
  "step.describe": "Describe",
  "step.analyze": "Analyze",
  "step.review": "Review",
  "step.summary": "Summary",
  "step.submit": "Submit",
  "describe.title": "Apni Shikayat Describe Karein",
  "describe.hint": "Type karein ya mic tap karke bolo. Issue aur landmark details add karein.",
  "describe.continueAnalysis": "AI Analysis par jao",
  "describe.continueReview": "Review par jao",
  "action.submit": "Official Complaint Submit Karein",
  "action.continueSummary": "Summary par jao",
  "success.title": "Complaint successfully submit ho gayi!",
  "routing.title": "Classification & Routing",
  "completeness.title": "Complaint Completeness",
  "app.myComplaints": "Meri Complaints",
};

const catalogs: Record<LanguageCode, Dict> = { en, kn, hi, ta, hin };

export function translate(
  lang: LanguageCode,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  let text = catalogs[lang]?.[key] ?? catalogs.en[key] ?? key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replaceAll(`{${k}}`, String(v));
    });
  }
  return text;
}

export function isLanguageCode(value: string): value is LanguageCode {
  return value === "en" || value === "kn" || value === "hi" || value === "ta" || value === "hin";
}
