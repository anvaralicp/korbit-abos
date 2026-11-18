import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Lock, Eye, AlertCircle, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Privacy Policy (DPDP Act 2023 Compliance) | KORBIT ABOS",
  description: "Digital Personal Data Protection Act 2023 compliance disclosure and work-hours-only GPS tracking policy.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">KORBIT Legal & Compliance Desk</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="space-y-2 border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-400 text-xs font-semibold">
            DPDP Act 2023 Compliant Fiduciary Standard
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Privacy Policy & Location Data Governance</h1>
          <p className="text-xs text-slate-400">
            Effective Date: March 1, 2026 • Statutory Jurisdiction: Republic of India
          </p>
        </div>

        <section className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">1. Legislative Scope & Commitment</h2>
          <p>
            KORBIT Autonomous Business Operating System (&ldquo;KORBIT ABOS&rdquo;) is developed in strict alignment with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act 2023)</strong> and applicable Indian data privacy regulations. This policy describes our responsibilities as a <em>Data Processor</em> acting on behalf of the subscriber organization (the <em>Data Fiduciary</em>), and our obligations toward individual employees and field executives (the <em>Data Principals</em>).
          </p>
        </section>

        <section className="space-y-4 text-xs text-slate-300 leading-relaxed p-5 bg-slate-900/60 border border-cyan-500/30 rounded-2xl">
          <div className="flex items-center gap-2 text-sm font-bold text-cyan-400">
            <Lock className="w-4 h-4" />
            2. Work-Hours-Only GPS Privacy Kill-Switch (DPDP Rule 4.1)
          </div>
          <p>
            We recognize that continuous location surveillance outside duty hours constitutes an unconstitutional invasion of employee privacy. Accordingly, KORBIT ABOS implements an automated, immutable <strong>GPS Privacy Kill-Switch</strong>:
          </p>
          <ul className="space-y-2 pl-4 list-disc marker:text-cyan-400">
            <li>
              <strong>Active Tracking Window:</strong> Location coordinates are polled and processed <em>exclusively</em> while an employee is actively in an open shift (between authenticated duty Sign-In and Sign-Out).
            </li>
            <li>
              <strong>Immediate Deactivation:</strong> The instant the executive executes a &ldquo;Sign-Out&rdquo; action, the server sets <code>isGpsTrackingLive = false</code>. All background GPS telemetry ceases immediately.
            </li>
            <li>
              <strong>No Off-Duty Geolocation Storage:</strong> Zero GPS coordinates are polled, transmitted, or persisted on off-duty hours, weekends, or approved leave periods.
            </li>
            <li>
              <strong>Geo-Fence Verification Purpose:</strong> Latitude and longitude coordinates collected during field meetings are utilized strictly for calculating Haversine distance to client premises (ensuring the 100m client check-in threshold) and for computing road travel allowance (TA) reimbursements.
            </li>
          </ul>
        </section>

        <section className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">3. Purpose Limitation & Data Minimization</h2>
          <p>
            Personal data collected by KORBIT ABOS is strictly confined to what is necessary for corporate performance evaluation, hierarchical workflow routing, and statutory compliance:
          </p>
          <ul className="space-y-1.5 pl-4 list-disc text-slate-400">
            <li>Identity Information: Full Name, Official Email Address, Employee Code, Designation, Reporting Officer.</li>
            <li>Operational Metrics: Attendance timestamps, client visit check-in records, travel distances, sales targets, and pipeline progression.</li>
            <li>Audio Transcriptions: Voice notes dictated by field executives for client follow-ups are processed via Google Gemini Flash models solely for summary and CRM field population, and are never repurposed for model training.</li>
          </ul>
        </section>

        <section className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">4. Cryptographic Storage & Multi-Tenant Isolation</h2>
          <p>
            All tenant data resides in cryptographically partitioned schemas with foreign-key isolation enforcing <code>tenantId</code> boundaries on all database queries. Password hashes are computed using PBKDF2 with SHA-512 and unique 16-byte random salts. Sensitive administrative and operational transitions are permanently logged to an append-only, SHA-256 hash-chained immutable audit log.
          </p>
        </section>

        <section className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">5. Data Principal Rights & Redressal</h2>
          <p>
            In accordance with Chapter III of the DPDP Act 2023, Data Principals possess the right to:
          </p>
          <ul className="space-y-1 pl-4 list-disc text-slate-400">
            <li>Access a summary of personal data being processed.</li>
            <li>Request correction or completion of inaccurate information through the built-in Client Correction Request workflow.</li>
            <li>Grievance redressal via our designated compliance desk: <code>privacy@korbit.in</code>.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
