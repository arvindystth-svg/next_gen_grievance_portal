export type VerificationMethod = "mobile" | "digilocker";

export interface CitizenSession {
  method: VerificationMethod;
  /** One-way hash — mobile number is never stored in plain text. */
  citizenHash: string;
  /** Masked mobile or generic DigiLocker label for display only. */
  maskedContact: string;
  verifiedAt: string;
}

const SESSION_KEY = "cpgrams_citizen_session_v1";
export const DEMO_OTP = "123456";

export function maskMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "").slice(-10);
  if (digits.length < 10) return "+91 **********";
  return `+91 *****${digits.slice(-4)}`;
}

async function digestId(input: string, prefix: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}${hex.slice(0, 32)}`;
}

export async function hashMobile(mobile: string): Promise<string> {
  const digits = mobile.replace(/\D/g, "").slice(-10);
  return digestId(`cpgrams-mobile-v1:${digits}`, "m_");
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

export function saveCitizenSession(session: CitizenSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearCitizenSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export async function verifyMobileOtp(
  mobile: string,
  otp: string
): Promise<CitizenSession | null> {
  const digits = mobile.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10 || otp.trim() !== DEMO_OTP) return null;

  const session: CitizenSession = {
    method: "mobile",
    citizenHash: await hashMobile(digits),
    maskedContact: maskMobile(digits),
    verifiedAt: new Date().toISOString(),
  };
  saveCitizenSession(session);
  return session;
}

/** DigiLocker flow — issues an anonymous session without storing name or Aadhaar. */
export async function verifyWithDigiLocker(): Promise<CitizenSession> {
  const session: CitizenSession = {
    method: "digilocker",
    citizenHash: await digestId(`cpgrams-digilocker-v1:${crypto.randomUUID()}`, "dl_"),
    maskedContact: "DigiLocker verified",
    verifiedAt: new Date().toISOString(),
  };
  saveCitizenSession(session);
  return session;
}
