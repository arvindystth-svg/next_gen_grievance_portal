"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Shield, Loader2, ChevronRight, User } from "lucide-react";
import {
  DEMO_CITIZENS,
  findDemoCitizen,
  loadCitizenSession,
  normalizeMobile,
  saveCitizenSession,
  verifyDemoOtp,
} from "@/lib/citizenAuth";

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (loadCitizenSession()) {
      router.replace("/");
      return;
    }
    setCheckingSession(false);
  }, [router]);

  const handleSendOtp = () => {
    setError(null);
    const normalized = normalizeMobile(mobile);
    if (normalized.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!findDemoCitizen(normalized)) {
      setError("This demo portal only accepts the 5 registered test numbers below.");
      return;
    }
    setOtpSent(true);
  };

  const handleVerify = async () => {
    setError(null);
    const normalized = normalizeMobile(mobile);
    const citizen = verifyDemoOtp(normalized, otp);
    if (!citizen) {
      setError("Invalid OTP. Use the OTP shown for your demo account.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    saveCitizenSession(citizen);
    router.replace("/");
  };

  const fillDemo = (demoMobile: string, demoOtp: string) => {
    setMobile(demoMobile);
    setOtp(demoOtp);
    setOtpSent(true);
    setError(null);
  };

  if (checkingSession) {
    return (
      <div className="h-dvh flex items-center justify-center bg-slate-100">
        <Loader2 className="animate-spin text-[#1a3c6e]" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-100 flex flex-col">
      <header className="bg-[#1a3c6e] text-white shadow-lg">
        <div className="h-1 bg-[#f97316]" />
        <div className="max-w-md mx-auto px-4 py-6 text-center">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow">
            <span className="text-2xl">🏛️</span>
          </div>
          <h1 className="text-xl font-bold">AI CPGRAMS Local</h1>
          <p className="text-blue-200 text-sm mt-1">Citizen login · Bengaluru</p>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 text-[#1a3c6e]">
            <Shield size={18} />
            <h2 className="font-bold text-sm">Mobile OTP login</h2>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Mobile number
            </label>
            <div className="mt-1.5 flex items-center gap-2 border-2 border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-blue-500 bg-white">
              <Phone size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-500 text-sm">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(normalizeMobile(e.target.value))}
                placeholder="9876543210"
                className="flex-1 text-sm outline-none text-slate-800"
              />
            </div>
          </div>

          {!otpSent ? (
            <button
              type="button"
              onClick={handleSendOtp}
              className="w-full bg-[#1a3c6e] hover:bg-[#2563eb] text-white font-bold py-3 rounded-xl transition-colors"
            >
              Send OTP
            </button>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  One-time password
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit OTP"
                  className="mt-1.5 w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 tracking-[0.3em] text-center font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Demo OTP is pre-filled when you pick an account below.
                </p>
              </div>

              <button
                type="button"
                onClick={handleVerify}
                disabled={loading || otp.length !== 6}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
                Verify &amp; continue
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                }}
                className="w-full text-sm text-slate-500 hover:text-slate-700"
              >
                Change mobile number
              </button>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Demo accounts (tap to fill)
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {DEMO_CITIZENS.map((citizen) => (
              <li key={citizen.id}>
                <button
                  type="button"
                  onClick={() => fillDemo(citizen.mobile, citizen.otp)}
                  className="w-full text-left px-5 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-[#1a3c6e]/10 text-[#1a3c6e] flex items-center justify-center font-bold text-sm">
                    <User size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800">{citizen.name}</p>
                    <p className="text-xs text-slate-500">
                      +91 {citizen.mobile} · OTP {citizen.otp} · {citizen.locality}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-center text-[11px] text-slate-400 leading-relaxed px-4">
          Demo portal only. OTP verification is simulated for the five test citizens above.
        </p>
      </main>
    </div>
  );
}
