export type GrievanceCategory =
  | "Water Supply"
  | "Roads"
  | "Sanitation"
  | "Streetlights"
  | "Parks"
  | "Stormwater Drains"
  | "Other";

export interface SeedGrievance {
  id: string;
  category: GrievanceCategory;
  title: string;
  description: string;
  lat: number;
  lng: number;
  ward: string;
  zone: string;
  upvotes: number;
  reportedAt: string;
  department: string;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  cpgrams_category: string;
}

export const SEED_GRIEVANCES: SeedGrievance[] = [
  {
    id: "GRV-001",
    category: "Water Supply",
    title: "Major water main burst leaking onto 10th Main Rd, Koramangala",
    description:
      "A large water main has burst and is continuously leaking onto 10th Main Road, Koramangala. Water wastage is severe and the road is flooded, causing traffic disruption and risking structural damage to adjacent properties.",
    lat: 12.9344,
    lng: 77.6251,
    ward: "Ward 151 - Koramangala",
    zone: "South Zone",
    upvotes: 14,
    reportedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    department: "BWSSB Water Supply",
    urgency: "HIGH",
    cpgrams_category: "Ministry of Housing and Urban Affairs",
  },
  {
    id: "GRV-002",
    category: "Roads",
    title: "Deep pothole cluster outside Columbia Asia Hospital, Bellandur",
    description:
      "A dangerous cluster of deep potholes has formed outside Columbia Asia Hospital on the Bellandur main road. Multiple vehicles have been damaged and the location near a hospital creates urgent safety risks for patients and emergency vehicles.",
    lat: 12.9279,
    lng: 77.6801,
    ward: "Ward 150 - Bellandur",
    zone: "East Zone",
    upvotes: 32,
    reportedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    department: "BBMP Roads & Infrastructure",
    urgency: "HIGH",
    cpgrams_category: "Ministry of Road Transport and Highways",
  },
  {
    id: "GRV-003",
    category: "Sanitation",
    title: "Uncleared blackspot garbage pile near Indiranagar Metro Station",
    description:
      "A large accumulation of mixed solid waste has been left uncleared for over 5 days near the Indiranagar Metro Station entrance. The blackspot is creating severe health hazards and is visible to thousands of daily commuters.",
    lat: 12.9784,
    lng: 77.6386,
    ward: "Ward 80 - Hoysala Nagar",
    zone: "East Zone",
    upvotes: 8,
    reportedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    department: "BBMP Solid Waste Management",
    urgency: "MEDIUM",
    cpgrams_category: "Ministry of Housing and Urban Affairs",
  },
];

export const CITIZEN_PROFILE = {
  name: "Ramesh Kumar",
  phone: "+91 98765 43210",
  city: "Bengaluru, Karnataka",
  id: "CIT-BLR-2024-8821",
  registeredWard: "Ward 151 - Koramangala",
};

export const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946 };

export const DEMO_PRESETS = [
  {
    label: "Water Leak (Koramangala)",
    icon: "💧",
    text: "There is a major water main burst on 10th Main Road, Koramangala. Water is gushing out and flooding the road near the signal. BWSSB needs to send a repair crew immediately.",
    lat: 12.9344,
    lng: 77.6251,
    category: "Water Supply" as GrievanceCategory,
    seedId: "GRV-001",
  },
  {
    label: "Pothole Cluster (Bellandur)",
    icon: "🕳️",
    text: "There are multiple deep potholes outside Columbia Asia Hospital in Bellandur. An auto-rickshaw lost its tyre this morning. This stretch of road is extremely dangerous.",
    lat: 12.9279,
    lng: 77.6801,
    category: "Roads" as GrievanceCategory,
    seedId: "GRV-002",
  },
  {
    label: "Garbage Pile (Indiranagar)",
    icon: "🗑️",
    text: "Garbage has not been cleared for 5 days near Indiranagar Metro Station. The pile is huge, smells terrible, and is causing a health hazard. BBMP sweepers have not visited the area.",
    lat: 12.9784,
    lng: 77.6386,
    category: "Sanitation" as GrievanceCategory,
    seedId: "GRV-003",
  },
];
