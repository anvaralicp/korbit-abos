"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Users,
  MapPin,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

interface SeededAccount {
  label: string;
  role: string;
  email: string;
  layer: number;
}

const SEEDED_ACCOUNTS: SeededAccount[] = [
  { label: "CEO / Admin", role: "Layer 01 Admin", email: "admin@korbit.in", layer: 1 },
  { label: "Sales Head", role: "Layer 02 Head", email: "saleshead@korbit.in", layer: 2 },
  { label: "HR Head", role: "Layer 02 Head", email: "hr@korbit.in", layer: 2 },
  { label: "Commercial Head", role: "Layer 02 Head", email: "commercial@korbit.in", layer: 2 },
  { label: "Kochi City Mgr", role: "Layer 05 City Mgr", email: "kochi@korbit.in", layer: 5 },
  { label: "Rahul Sharma", role: "Layer 06 Field Exec", email: "rahul@korbit.in", layer: 6 },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@korbit.in");
  const [password, setPassword] = useState("Korbit#Demo2026");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // First-time Password Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // DPDP GPS Consent Modal State
  const [showGpsConsentModal, setShowGpsConsentModal] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [targetRedirectUrl, setTargetRedirectUrl] = useState("/dashboard/command");

  const executeLogin = async (loginEmail = email, loginPass = password) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed");
      }

      setTargetRedirectUrl(data.redirectUrl);

      // Gate 1: First-Time Password Reset
      if (data.mustResetPassword) {
        setShowResetModal(true);
        setLoading(false);
        return;
      }

      // Gate 2: Mandatory DPDP Work-Hours GPS Consent (primarily for field executives)
      if (data.needsGpsConsent) {
        setShowGpsConsentModal(true);
        setLoading(false);
        return;
      }

      // Route directly
      router.push(data.redirectUrl);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin();
  };

  const handleQuickLogin = (account: SeededAccount) => {
    setEmail(account.email);
    setPassword("Korbit#Demo2026");
    executeLogin(account.email, "Korbit#Demo2026");
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Password reset failed");
      }

      setShowResetModal(false);
      // Check if GPS consent is also needed before routing
      if (showGpsConsentModal) {
        return;
      }
      router.push(targetRedirectUrl);
    } catch (err: any) {
      alert(err.message || "Password update error");
    } finally {
      setResetLoading(false);
    }
  };

  const handleGpsConsent = async () => {
    setConsentLoading(true);
    try {
      const res = await fetch("/api/auth/gps-consent", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record consent");
      }

      setShowGpsConsentModal(false);
      router.push(targetRedirectUrl);
    } catch (err: any) {
      alert(err.message || "Error submitting DPDP consent");
    } finally {
      setConsentLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden text-slate-100 font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        <div className="text-center flex flex-col items-center justify-center space-y-2">
          <Link href="/" className="inline-block">
            <BrandLogo variant="dark" size="lg" showTagline={true} />
          </Link>
          <p className="text-xs text-slate-400 font-medium">
            Tenant Command & Field Authentication Gateway
          </p>
        </div>

        {/* Dev Quick-Login Bar */}
        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
              Dev Quick-Login Bar
            </span>
            <span>Pre-seeded Nodes</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {SEEDED_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleQuickLogin(acc)}
                className="p-2 text-left bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 rounded-xl transition cursor-pointer"
              >
                <div className="font-semibold text-slate-200 line-clamp-1">{acc.label}</div>
                <div className="text-[10px] text-cyan-400">{acc.role}</div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 flex items-center gap-2.5 text-xs text-red-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Official Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/40 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Authenticating..." : "Sign In with Session Cookie"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-400">
          Need a company organization account?{" "}
          <Link href="/register" className="font-semibold text-cyan-400 hover:underline">
            Register Tenant
          </Link>
        </div>
      </div>

      {/* MODAL 1: FIRST-TIME PASSWORD RESET */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">First-Time Password Reset Required</h3>
                <p className="text-xs text-slate-400">Set a personal password before accessing the system</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
              For security compliance, initial 72-hour temporary passwords must be updated upon first sign-in.
            </p>

            <form onSubmit={handlePasswordReset} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs disabled:opacity-50"
                >
                  {resetLoading ? "Updating Password..." : "Update Password & Proceed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DPDP ACT 2023 GPS & KYC CONSENT */}
      {showGpsConsentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">DPDP Act 2023 Work-Hours GPS Consent</h3>
                <p className="text-xs text-slate-400">Statutory employee location & field verification policy</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <p className="font-semibold text-cyan-400">
                Digital Personal Data Protection Act, 2023 Privacy Notice:
              </p>
              <ul className="space-y-1.5 pl-4 list-disc marker:text-cyan-400 text-slate-400">
                <li>
                  <strong>Work-Hours-Only:</strong> Location coordinates are recorded ONLY between shift Sign-In and Sign-Out.
                </li>
                <li>
                  <strong>Automatic Kill-Switch:</strong> All background geolocation tracking ceases immediately when you Sign-Out.
                </li>
                <li>
                  <strong>Field Verification:</strong> Coordinates are used strictly for 100m client check-in geo-fencing and road travel allowance (TA) calculation.
                </li>
              </ul>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowGpsConsentModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={consentLoading}
                onClick={handleGpsConsent}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {consentLoading ? "Recording..." : "I Consent & Enter Portal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
