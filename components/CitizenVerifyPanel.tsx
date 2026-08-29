"use client";

import { useState } from "react";
import { Phone, Shield, Loader2, Fingerprint } from "lucide-react";
import {
  CitizenSession,
  DEMO_OTP,
  verifyMobileOtp,
  verifyWithDigiLocker,
} from "@/lib/citizenSession";

interface CitizenVerifyPanelProps {
  title?: string;
  description?: string;
  onVerified: (session: CitizenSession) => void;
  compact?: boolean;
}

export default function CitizenVerifyPanel({
  title = "Verify to view your complaints",
  description = "No passwords or reference numbers needed. Verify once with your mobile or DigiLocker — your identity stays private.",
  onVerified,
  compact = false,
}: CitizenVerifyPanelProps) {
  const [mode, setMode] = useState<"mobile" | "digilocker">("mobile");
  const [mobile, setMobile] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendOtp = () => {
    const digits = mobile.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setError(null);
    setOtpSent(true);
  };

  const confirmOtp = async () => {
    setLoading(true);
    setError(null);
    const session = await verifyMobileOtp(mobile, otp);
    setLoading(false);
    if (!session) {
      setError(`Invalid OTP. For this demo, use ${DEMO_OTP}.`);
      return;
    }
    onVerified(session);
  };

  const handleDigiLocker = async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const session = await verifyWithDigiLocker();
      onVerified(session);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl overflow-hidden ${
        compact ? "shadow-sm" : "shadow-sm"
      }`}
    >
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-4">
        <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
          <Shield size={16} className="text-green-600" />
          {title}
        </h3>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setMode("mobile");
              setError(null);
            }}
            className={`flex-1 py-2 rounded-md text-xs font-semibold transition-colors ${
              mode === "mobile" ? "bg-white text-[#1a3c6e] shadow-sm" : "text-slate-500"
            }`}
          >
            Mobile OTP
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("digilocker");
              setError(null);
            }}
            className={`flex-1 py-2 rounded-md text-xs font-semibold transition-colors ${
              mode === "digilocker" ? "bg-white text-[#1a3c6e] shadow-sm" : "text-slate-500"
            }`}
          >
            DigiLocker
          </button>
        </div>

        {mode === "mobile" ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Mobile number
              </label>
              <div className="relative mt-1.5">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  autoComplete="tel"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Only a masked number is shown in the app. Your full number is not stored.
              </p>
            </div>

            {!otpSent ? (
              <button
                type="button"
                onClick={sendOtp}
                className="w-full bg-[#1a3c6e] hover:bg-[#2563eb] text-white font-semibold py-2.5 rounded-xl text-sm"
              >
                Send OTP
              </button>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit OTP"
                    maxLength={6}
                    className="w-full mt-1.5 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 tracking-widest"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Demo OTP: <span className="font-mono font-semibold">{DEMO_OTP}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={confirmOtp}
                  disabled={loading || otp.length < 6}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Verify &amp; continue
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800">
              DigiLocker verifies you without showing your name or Aadhaar on this portal. Only an
              anonymous secure token links your complaints.
            </div>
            <button
              type="button"
              onClick={handleDigiLocker}
              disabled={loading}
              className="w-full bg-[#1a3c6e] hover:bg-[#2563eb] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Fingerprint size={16} />
              )}
              Verify with DigiLocker
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
      </div>
    </div>
  );
}
