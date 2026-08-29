export interface DemoCitizen {
  id: string;
  name: string;
  mobile: string;
  otp: string;
  locality: string;
}

export interface CitizenSession {
  citizenId: string;
  name: string;
  mobile: string;
  maskedMobile: string;
  locality: string;
  loggedInAt: string;
}

const SESSION_KEY = "cpgrams_citizen_session_v1";

export const DEMO_CITIZENS: DemoCitizen[] = [
  { id: "c1", name: "Ramesh Kumar", mobile: "9876543210", otp: "123456", locality: "Koramangala" },
  { id: "c2", name: "Priya Nair", mobile: "9876543211", otp: "234567", locality: "Indiranagar" },
  { id: "c3", name: "Suresh Reddy", mobile: "9876543212", otp: "345678", locality: "Bellandur" },
  { id: "c4", name: "Ananya Das", mobile: "9876543213", otp: "456789", locality: "Jayanagar" },
  { id: "c5", name: "Mohammed Ali", mobile: "9876543214", otp: "567890", locality: "Shivajinagar" },
];

export function normalizeMobile(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

export function maskMobile(mobile: string): string {
  const digits = normalizeMobile(mobile);
  if (digits.length < 4) return digits;
  return `******${digits.slice(-4)}`;
}

export function findDemoCitizen(mobile: string): DemoCitizen | undefined {
  const normalized = normalizeMobile(mobile);
  return DEMO_CITIZENS.find((c) => c.mobile === normalized);
}

export function verifyDemoOtp(mobile: string, otp: string): DemoCitizen | null {
  const citizen = findDemoCitizen(mobile);
  if (!citizen) return null;
  if (otp.replace(/\D/g, "") !== citizen.otp) return null;
  return citizen;
}

export function saveCitizenSession(citizen: DemoCitizen): CitizenSession {
  const session: CitizenSession = {
    citizenId: citizen.id,
    name: citizen.name,
    mobile: citizen.mobile,
    maskedMobile: maskMobile(citizen.mobile),
    locality: citizen.locality,
    loggedInAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

export function loadCitizenSession(): CitizenSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CitizenSession;
  } catch {
    return null;
  }
}

export function clearCitizenSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}
