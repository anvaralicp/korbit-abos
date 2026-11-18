"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Users,
  Building,
  MapPin,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  KeyRound,
  Copy,
  Check,
  Layers,
  ChevronRight,
} from "lucide-react";
import { ZoneCode } from "@prisma/client";
import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";

function SetupOrgContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantId = searchParams.get("tenantId") || "";

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Department Heads state
  const [heads, setHeads] = useState({
    salesHead: {
      fullName: "Anand Narayanan",
      email: "sales.head@korbit-demo.com",
      mobile: "9847012345",
      designation: "Head of Sales & Business Development",
    },
    hrHead: {
      fullName: "Priya Varma",
      email: "hr.head@korbit-demo.com",
      mobile: "9847023456",
      designation: "Head of Human Resources & Operations",
    },
    commercialHead: {
      fullName: "Mathew Joseph",
      email: "commercial.head@korbit-demo.com",
      mobile: "9847034567",
      designation: "Head of Commercial & Finance",
    },
  });

  // Successful provisioning result
  const [provisionResult, setProvisionResult] = useState<{
    departmentHeads: Array<{
      id: string;
      employeeCode: string;
      fullName: string;
      email: string;
      department: string;
      roleLevel: string;
      layerDepth: number;
      materializedPath: string;
      temporaryPassword: string;
      inviteExpiresAt: string;
    }>;
    hierarchySummary: {
      zonesCount: number;
      statesCount: number;
      divisionsCount: number;
    };
  } | null>(null);

  const handleHeadChange = (
    dept: "salesHead" | "hrHead" | "commercialHead",
    field: string,
    value: string
  ) => {
    setHeads((prev) => ({
      ...prev,
      [dept]: {
        ...prev[dept],
        [field]: value,
      },
    }));
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleFinalizeSetup = async () => {
    if (!tenantId) {
      setErrorMsg("Missing Tenant ID in query string.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/onboarding/setup-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          salesHead: heads.salesHead,
          hrHead: heads.hrHead,
          commercialHead: heads.commercialHead,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Setup failed. Check inputs.");
      }

      setProvisionResult({
        departmentHeads: data.departmentHeads,
        hierarchySummary: data.hierarchySummary,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to finalize organization setup.");
    } finally {
      setLoading(false);
    }
  };

  if (provisionResult) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-emerald-950 border border-emerald-800 rounded-2xl text-emerald-400 mb-3">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Organization Provisioning Complete
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl mx-auto">
              Dynamic Layer Detection (DLD) Hierarchy & 5-Zone Geographic Architecture have been successfully compiled into the immutable ledger.
            </p>
          </div>

          {/* Provisioning Stat Badges */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Zones</span>
              <div className="text-2xl font-black text-blue-400 mt-1">
                {provisionResult.hierarchySummary.zonesCount}
              </div>
              <span className="text-[11px] text-slate-400">All 5 Pan-India Zones</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">States</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {provisionResult.hierarchySummary.statesCount}
              </div>
              <span className="text-[11px] text-slate-400">Regions Linked</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Divisions</span>
              <div className="text-2xl font-black text-purple-400 mt-1">
                {provisionResult.hierarchySummary.divisionsCount}
              </div>
              <span className="text-[11px] text-slate-400">Min 4 / State Enforced</span>
            </div>
          </div>

          {/* Department Head Credentials Handover */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-400" />
                Layer 02 Department Heads (72-Hour Temporary Credentials)
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300">
                Expires in 72 Hours
              </span>
            </div>

            <div className="space-y-3">
              {provisionResult.departmentHeads.map((head, idx) => (
                <div
                  key={head.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{head.fullName}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-blue-950 border border-blue-800 text-blue-300 rounded font-semibold">
                        {head.department}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {head.employeeCode}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {head.email} • Depth: {head.layerDepth} • Path:{" "}
                      <span className="font-mono text-[11px] text-slate-500">
                        {head.materializedPath}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 shrink-0">
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {head.temporaryPassword}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `Email: ${head.email} | Code: ${head.employeeCode} | Temp Password: ${head.temporaryPassword}`,
                          idx
                        )
                      }
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                      title="Copy credentials"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2"
          >
            Enter KORBIT ABOS Workspace
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Wizard Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Link href="/" className="mb-4 inline-block">
            <BrandLogo variant="dark" size="lg" />
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold mb-3">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Subscription Active • Organization Hierarchy Setup
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Configure Organizational Hierarchy & Zones
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl mx-auto">
            Provision the 3 Layer 02 Department Heads (Sales, HR, Commercial) and initialize the 5-Zone Pan-India territory tree with mandatory 4-division minimums.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800 flex items-start gap-3 text-red-200">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-400" />
            <div>
              <p className="font-semibold text-sm">Hierarchy Setup Error</p>
              <p className="text-xs text-red-300 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Section 1: Department Heads */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-white">
                  Step 1: Layer 02 Department Heads Invitation
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Created under Admin using Dynamic Layer Detection (DLD)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sales Head */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                    Sales Department
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-blue-950 border border-blue-800 text-blue-300 rounded font-semibold">
                    Depth 2
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={heads.salesHead.fullName}
                    onChange={(e) => handleHeadChange("salesHead", "fullName", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Corporate Email</label>
                  <input
                    type="email"
                    value={heads.salesHead.email}
                    onChange={(e) => handleHeadChange("salesHead", "email", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={heads.salesHead.mobile}
                    onChange={(e) => handleHeadChange("salesHead", "mobile", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* HR Head */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    HR & Operations
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded font-semibold">
                    Depth 2
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={heads.hrHead.fullName}
                    onChange={(e) => handleHeadChange("hrHead", "fullName", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Corporate Email</label>
                  <input
                    type="email"
                    value={heads.hrHead.email}
                    onChange={(e) => handleHeadChange("hrHead", "email", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={heads.hrHead.mobile}
                    onChange={(e) => handleHeadChange("hrHead", "mobile", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Commercial Head */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                    Commercial & Finance
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-purple-950 border border-purple-800 text-purple-300 rounded font-semibold">
                    Depth 2
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={heads.commercialHead.fullName}
                    onChange={(e) => handleHeadChange("commercialHead", "fullName", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Corporate Email</label>
                  <input
                    type="email"
                    value={heads.commercialHead.email}
                    onChange={(e) => handleHeadChange("commercialHead", "email", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={heads.commercialHead.mobile}
                    onChange={(e) => handleHeadChange("commercialHead", "mobile", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: 5-Zone Architecture */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">
                  Step 2: 5-Zone Geographic Architecture & Division Enforcement
                </h2>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-semibold">
                Min 4 Divisions / State
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              KORBIT ABOS provisions a standard 5-zone structure (<span className="text-slate-200">SOUTH, NORTH, WEST, EAST, NORTHEAST</span>). Each State Region enforces a strict rule: a minimum of 4 State Division nodes are created to support city managers and field executives.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-400">South Zone</span>
                  <span className="text-[10px] text-slate-500 font-mono">SOUTH</span>
                </div>
                <div className="text-xs text-slate-300 font-semibold mb-1">States:</div>
                <ul className="text-[11px] text-slate-400 space-y-1 pl-4 list-disc">
                  <li>Kerala (4 Divisions: TVM, Kochi, Kozhikode, Kollam)</li>
                  <li>Tamil Nadu (4 Divisions: Chennai N, Chennai S, CBE, Madurai)</li>
                  <li>Karnataka (4 Divisions: Blr Central, Blr East, Mysuru, Hubballi)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-400">North Zone</span>
                  <span className="text-[10px] text-slate-500 font-mono">NORTH</span>
                </div>
                <div className="text-xs text-slate-300 font-semibold mb-1">States:</div>
                <ul className="text-[11px] text-slate-400 space-y-1 pl-4 list-disc">
                  <li>Delhi NCR (4 Divisions: Central, Gurugram, Noida, Faridabad)</li>
                  <li>Punjab (4 Divisions: Ludhiana, Amritsar, Jalandhar, Mohali)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-purple-400">West Zone</span>
                  <span className="text-[10px] text-slate-500 font-mono">WEST</span>
                </div>
                <div className="text-xs text-slate-300 font-semibold mb-1">States:</div>
                <ul className="text-[11px] text-slate-400 space-y-1 pl-4 list-disc">
                  <li>Maharashtra (4 Divisions: Mumbai S, Mumbai W, Pune, Nagpur)</li>
                  <li>Gujarat (4 Divisions: Ahmedabad, Surat, Vadodara, Rajkot)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-400">East Zone</span>
                  <span className="text-[10px] text-slate-500 font-mono">EAST</span>
                </div>
                <div className="text-xs text-slate-300 font-semibold mb-1">States:</div>
                <ul className="text-[11px] text-slate-400 space-y-1 pl-4 list-disc">
                  <li>West Bengal (4 Divisions: Central, Salt Lake, Howrah, Siliguri)</li>
                  <li>Odisha (4 Divisions: Bhubaneswar, Cuttack, Rourkela, Berhampur)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-rose-400">Northeast Zone</span>
                  <span className="text-[10px] text-slate-500 font-mono">NORTHEAST</span>
                </div>
                <div className="text-xs text-slate-300 font-semibold mb-1">States:</div>
                <ul className="text-[11px] text-slate-400 space-y-1 pl-4 list-disc">
                  <li>Assam (4 Divisions: Guwahati, Dibrugarh, Silchar, Jorhat)</li>
                </ul>
              </div>

              <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <Building className="w-6 h-6 text-slate-600 mb-1" />
                <span className="text-xs font-semibold text-slate-400">Commercial Standard</span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Pre-configured Pan-India Coverage
                </span>
              </div>
            </div>
          </div>

          {/* Action CTA */}
          <button
            type="button"
            disabled={loading}
            onClick={handleFinalizeSetup}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-900/30 text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Provisioning DLD Nodes & Territory Divisions...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Finalize & Provision Organization Structure
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SetupOrgPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <SetupOrgContent />
    </Suspense>
  );
}
