"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  Percent,
  ShieldCheck,
  Building,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  RefreshCw,
  Search,
  AlertTriangle,
  Lock,
  Eye,
  Check,
  X,
  Sparkles,
  ChevronRight,
  Layers,
  FileCheck,
  Download,
  Key,
} from "lucide-react";
import SupportWidget from "@/components/SupportWidget";
import { BrandLogo } from "@/components/BrandLogo";

type TabKey = "hierarchy" | "pipeline" | "discounts" | "audit" | "commercial" | "hr";

export default function CommandDashboardPage() {
  const [selectedRole, setSelectedRole] = useState("LAYER_01_ADMIN");
  const [activeTab, setActiveTab] = useState<TabKey>("hierarchy");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [proposalPdfUrl, setProposalPdfUrl] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboardData = async (role = selectedRole) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/dashboard/command-data?role=${role}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load command data");
      setData(json);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedRole);
  }, [selectedRole]);

  // Discount Action Handler
  const handleDiscountAction = async (
    dealId: string,
    discountRequestId: string,
    action: "ACCEPT" | "REJECT_ESCALATE" | "DENY"
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/negotiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": data?.actingUser?.id,
          "x-tenant-id": data?.tenant?.id,
        },
        body: JSON.stringify({
          discountRequestId,
          action,
          decisionRemarks: decisionNotes || `Actioned by ${data?.actingUser?.fullName} (${action})`,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Discount action failed");
      setDecisionNotes("");
      await fetchDashboardData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Run Cron Auto-Escalation
  const handleRunEscalationCron = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/cron/escalate-discounts?tenantId=${data?.tenant?.id}`);
      const resJson = await res.json();
      alert(`Auto-Escalation Cron Executed: ${resJson.escalatedCount} request(s) escalated.`);
      await fetchDashboardData();
    } catch (err: any) {
      alert(`Cron execution failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Correction Request Review
  const handleReviewCorrection = async (requestId: string, approved: boolean) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/clients/corrections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": data?.actingUser?.id,
          "x-tenant-id": data?.tenant?.id,
        },
        body: JSON.stringify({
          requestId,
          approved,
          adminNotes: approved ? "Approved by Administrator" : "Rejected by Administrator",
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Review failed");
      await fetchDashboardData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-xl">
        <div className="flex items-center gap-4">
          <Link href="/">
            <BrandLogo variant="dark" size="md" />
          </Link>
          <div className="hidden sm:block border-l border-slate-800 pl-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">Command Center</span>
            <p className="text-xs text-slate-300 font-medium">
              {data?.tenant?.companyName || "Enterprise Workspace"} • {data?.tenant?.operatingState || "Regional"}
            </p>
          </div>
        </div>

        {/* Role Switcher */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Key className="w-3.5 h-3.5 text-blue-400" />
            Active Perspective:
          </span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs font-semibold text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 shadow-sm"
          >
            <option value="LAYER_01_ADMIN">Layer 01: Administrator (CEO)</option>
            <option value="LAYER_02_SALES_HEAD">Layer 02: Sales Head (VP Sales)</option>
            <option value="LAYER_02_HR_HEAD">Layer 02: HR Head (Head of People)</option>
            <option value="LAYER_02_COMMERCIAL_HEAD">Layer 02: Commercial Head (Finance)</option>
            <option value="LAYER_05_CITY_MANAGER">Layer 05: City Manager (Kochi)</option>
          </select>

          <button
            onClick={() => fetchDashboardData()}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/dashboard/field"
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
          >
            Field Mobile View
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          {[
            { key: "hierarchy", label: "1. Hierarchy & Sales Targets", icon: Users },
            { key: "pipeline", label: "2. Master Pipeline & Proposals", icon: TrendingUp },
            { key: "discounts", label: "3. Dual-Gate Discount Desk", icon: Percent },
            { key: "audit", label: "4. Data-Lock & Audit Ledger", icon: ShieldCheck },
            { key: "commercial", label: "5. Commercial Handoff Desk", icon: DollarSign },
            { key: "hr", label: "6. HR Travel & Attendance", icon: Building },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                    : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            {errorMsg}
          </div>
        )}

        {/* TAB 1: Hierarchy & Employee Performance */}
        {activeTab === "hierarchy" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Dynamic Layer Detection (DLD) Hierarchy & Performance Matrix
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time sales target tracking and chain-of-command accountability across all layers.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="py-3 px-4">Employee / Designation</th>
                    <th className="py-3 px-4">Layer / Dept</th>
                    <th className="py-3 px-4">Employee Code</th>
                    <th className="py-3 px-4">Reporting Senior</th>
                    <th className="py-3 px-4 text-right">Target Set</th>
                    <th className="py-3 px-4 text-right">Achieved</th>
                    <th className="py-3 px-4 text-right">Difference</th>
                    <th className="py-3 px-4 text-center">Performance %</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data?.data?.employees?.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{emp.fullName}</div>
                        <div className="text-[11px] text-slate-400">{emp.designation}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 border border-blue-800 text-blue-300">
                          L0{emp.layerDepth} • {emp.department}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{emp.employeeCode}</td>
                      <td className="py-3.5 px-4 text-slate-300">{emp.reportingTo}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-300">
                        {emp.targetAmount > 0 ? `₹${emp.targetAmount.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                        {emp.achievedAmount > 0 ? `₹${emp.achievedAmount.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-medium ${
                          emp.difference >= 0 ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {emp.targetAmount > 0 ? `₹${emp.difference.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {emp.targetAmount > 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 font-bold">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                emp.performancePct >= 80
                                  ? "bg-emerald-500"
                                  : emp.performancePct >= 60
                                  ? "bg-blue-500"
                                  : "bg-amber-500"
                              }`}
                            />
                            {emp.performancePct}%
                          </div>
                        ) : (
                          <span className="text-slate-500">N/A</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedEmployee(emp)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-xs font-semibold"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Master Client & 6-Stage Pipeline Board */}
        {activeTab === "pipeline" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  Master Client Catalog & 6-Stage Commercial Pipeline Board
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every account has data-lock protection enabled. Click on any deal to preview the automated GST Proposal PDF.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.data?.deals?.map((deal: any) => (
                <div
                  key={deal.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3 hover:border-slate-700 transition shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 border border-slate-800 text-blue-300 rounded font-semibold">
                        {deal.client.clientCode}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1.5">
                        {deal.client.companyName}
                      </h3>
                      <p className="text-xs text-slate-400">{deal.client.city}, {deal.client.stateRegion.stateName}</p>
                    </div>
                    <span className="p-1.5 bg-slate-900 rounded-lg text-amber-400" title="Data Locked">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 py-2 border-y border-slate-800/80">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Stage:</span>
                      <span className="font-bold text-blue-400 uppercase text-[11px]">
                        {deal.stage.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nature of Call:</span>
                      <span
                        className={`font-bold text-[11px] ${
                          deal.natureOfCall === "HOT"
                            ? "text-rose-400"
                            : deal.natureOfCall === "WARM"
                            ? "text-amber-400"
                            : "text-blue-300"
                        }`}
                      >
                        {deal.natureOfCall}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Owner / Rep:</span>
                      <span className="text-slate-200 font-medium">{deal.owner.fullName}</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-slate-400 font-semibold">Total Contract:</span>
                      <span className="font-extrabold text-white text-sm">
                        ₹{Number(deal.totalAmountInr).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setProposalPdfUrl(`/api/deals/${deal.id}/proposal`)}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      1-Click Proposal PDF
                    </button>
                    <a
                      href={`/api/deals/${deal.id}/proposal`}
                      download={`Proposal-${deal.dealCode}.pdf`}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                      title="Direct Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Dual-Gate Discount Escalation Desk */}
        {activeTab === "discounts" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Percent className="w-5 h-5 text-blue-400" />
                  Dual-Gate Multi-Product Discount Escalation Desk
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated SLA escalation (4h–48h). Approvals above executive cap route strictly according to the 6-Level Dual Gate matrix.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  disabled={actionLoading}
                  onClick={handleRunEscalationCron}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Run Auto-Escalation Cron
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="py-3 px-3">Req ID / Client</th>
                    <th className="py-3 px-3">Product</th>
                    <th className="py-3 px-3 text-right">Master Rate</th>
                    <th className="py-3 px-3 text-right">Offered Rate</th>
                    <th className="py-3 px-3 text-center">Discount %</th>
                    <th className="py-3 px-3">Assigned Approver</th>
                    <th className="py-3 px-3">SLA Status</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Decision Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data?.data?.discountRequests?.map((req: any) => {
                    const slaDate = new Date(req.slaExpiresAt);
                    const isExpired = slaDate.getTime() < Date.now();
                    const hoursLeft = ((slaDate.getTime() - Date.now()) / 3600000).toFixed(1);

                    return (
                      <tr key={req.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{req.deal.client.companyName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            By: {req.requestedBy.fullName}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-200">
                            {req.dealLineItem.product.name}
                          </span>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {req.dealLineItem.product.productCode}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400">
                          ₹{Number(req.actualPriceInr).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-white">
                          ₹{Number(req.offeredPriceInr).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded font-extrabold text-[11px] bg-amber-950 border border-amber-800 text-amber-300">
                            {Number(req.discountPercent).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-white font-medium">{req.currentApprover.fullName}</div>
                          <div className="text-[10px] text-blue-400">Level {req.currentApprovalLevel} Officer</div>
                        </td>
                        <td className="py-3 px-3">
                          {req.status === "PENDING" ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isExpired
                                  ? "bg-red-950 border border-red-800 text-red-300"
                                  : "bg-blue-950 border border-blue-800 text-blue-300"
                              }`}
                            >
                              {isExpired ? "SLA Expired" : `${hoursLeft}h remaining`}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Resolved</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              req.status === "APPROVED"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : req.status === "DENIED"
                                ? "bg-red-950 text-red-400 border border-red-800"
                                : "bg-amber-950 text-amber-300 border border-amber-800"
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {req.status === "PENDING" ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                disabled={actionLoading}
                                onClick={() => handleDiscountAction(req.dealId, req.id, "ACCEPT")}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold"
                                title="Accept Discount Rate"
                              >
                                Accept
                              </button>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleDiscountAction(req.dealId, req.id, "REJECT_ESCALATE")}
                                className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-bold"
                                title="Reject and Escalate to Superior Officer"
                              >
                                Reject ↑
                              </button>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleDiscountAction(req.dealId, req.id, "DENY")}
                                className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-bold"
                                title="Deny Discount Below Floor Price"
                              >
                                Deny
                              </button>
                            </div>
                          ) : (
                            <div className="text-center text-slate-500 text-[11px]">—</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Admin Client Correction Queue & Immutable Audit Ledger */}
        {activeTab === "audit" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Correction Requests (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Lock className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Client Correction Request Queue</h3>
              </div>
              <p className="text-xs text-slate-400">
                Managers cannot modify locked clients. Admin approval required to unlock and commit proposed edits.
              </p>

              <div className="space-y-3">
                {data?.data?.correctionRequests?.map((cr: any) => (
                  <div key={cr.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white text-xs">{cr.client.companyName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Requested by: {cr.requestedBy.fullName} ({cr.requestedBy.designation})
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 border border-amber-800 text-amber-300">
                        {cr.status}
                      </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800/80 rounded p-2 text-[11px] text-slate-300">
                      <span className="font-semibold text-slate-400">Reason:</span> {cr.reason}
                    </div>

                    {cr.status === "PENDING_ADMIN" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          disabled={actionLoading}
                          onClick={() => handleReviewCorrection(cr.id, true)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve & Update
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleReviewCorrection(cr.id, false)}
                          className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Immutable Audit Ledger (7 cols) */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Cryptographic Immutable Audit Ledger</h3>
              </div>
              <p className="text-xs text-slate-400">
                Append-only SHA-256 hash chains guarantee tamper evidence across all commercial mutations.
              </p>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {data?.data?.auditLogs?.map((log: any) => (
                  <div key={log.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-blue-400 text-[11px] uppercase">{log.action}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Entity: <span className="font-semibold text-white">{log.entityType}</span> • Actor:{" "}
                      <span className="text-slate-200">{log.actor?.fullName}</span>
                    </div>
                    <div className="pt-1 flex items-center gap-1 font-mono text-[10px] text-slate-500 truncate">
                      <span className="text-slate-400 font-bold shrink-0">SHA256:</span>
                      <span className="truncate text-emerald-400/80">{log.entryHash}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Commercial Handoff Desk (Stage 6 Closed Won) */}
        {activeTab === "commercial" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  Stage 6 Closed-Won Commercial KYC Handoff Desk
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Handed off to Finance for billing code creation, GST vendor record validation, and delivery clearance.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.data?.commercialHandoffs?.map((deal: any) => (
                <div key={deal.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                        CLOSED WON • COMMERCIAL HANDOFF
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1">{deal.client.companyName}</h3>
                      <p className="text-xs text-slate-400">Lead Rep: {deal.owner.fullName} ({deal.owner.employeeCode})</p>
                    </div>
                    <span className="text-base font-black text-white">
                      ₹{Number(deal.totalAmountInr).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
                    <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      Mandatory Vendor Creation KYC Checklist:
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {["GST Certificate", "PAN Card", "Cancelled Cheque"].map((docName) => (
                        <div
                          key={docName}
                          className="bg-slate-950 border border-slate-800 rounded p-2 text-center text-[11px]"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
                          <span className="text-slate-200 font-medium">{docName}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-slate-400 pt-1">
                    <span>Tax Jurisdiction: CGST + SGST (Kerala Intra-State)</span>
                    <span className="text-slate-300 font-semibold">Ready for Billing</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: Monthly HR & Travel Allowance Report */}
        {activeTab === "hr" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-400" />
                  Monthly Field Attendance & Travel Allowance Payroll Report
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated computation based on GPS road distance checks. Allowance rate: ₹10/km for 4-wheelers, ₹6/km for 2-wheelers.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="py-3 px-3">Employee Name</th>
                    <th className="py-3 px-3">Code / Mobile</th>
                    <th className="py-3 px-3 text-center">Days Worked</th>
                    <th className="py-3 px-3 text-center">Field Visits</th>
                    <th className="py-3 px-3 text-right">Road Distance</th>
                    <th className="py-3 px-3 text-right">Travel Allowance</th>
                    <th className="py-3 px-3 text-right">Incentives</th>
                    <th className="py-3 px-3 text-right">Net Payable</th>
                    <th className="py-3 px-3 text-center">Resignation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data?.data?.hrReports?.map((rep: any) => (
                    <tr key={rep.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-white">{rep.user.fullName}</div>
                        <div className="text-[11px] text-slate-400">{rep.user.designation}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-mono text-slate-300">{rep.user.employeeCode}</div>
                        <div className="text-slate-500">{rep.user.mobile}</div>
                      </td>
                      <td className="py-3.5 px-3 text-center font-semibold text-slate-200">{rep.daysWorked} Days</td>
                      <td className="py-3.5 px-3 text-center font-bold text-blue-400">{rep.totalFieldVisits} Visits</td>
                      <td className="py-3.5 px-3 text-right font-medium text-slate-200">
                        {Number(rep.totalTravelDistanceKm).toFixed(1)} km
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-emerald-400">
                        ₹{Number(rep.travelAllowanceInr).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-3 text-right text-slate-300">
                        ₹{Number(rep.incentivesInr).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-3 text-right font-black text-white text-sm">
                        ₹{Number(rep.netPayableInr).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {rep.user.isResignationFrozen ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 border border-red-800 text-red-300">
                            Frozen (Notice Period)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 border border-emerald-800 text-emerald-300">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* PDF Modal Viewer */}
      {proposalPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Commercial Proposal PDF Live Stream</h3>
              </div>
              <button
                onClick={() => setProposalPdfUrl(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-950 p-2">
              <iframe src={proposalPdfUrl} className="w-full h-full rounded-lg border-0" />
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-white">{selectedEmployee.fullName}</h3>
                <p className="text-xs text-slate-400">{selectedEmployee.designation}</p>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Employee Code:</span>
                <span className="font-mono text-white">{selectedEmployee.employeeCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="text-white">{selectedEmployee.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reporting Officer:</span>
                <span className="text-white font-medium">{selectedEmployee.reportingTo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hierarchy Depth:</span>
                <span className="text-blue-400 font-bold">Layer {selectedEmployee.layerDepth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Materialized Path:</span>
                <span className="font-mono text-[10px] text-slate-500">{selectedEmployee.materializedPath}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Tenant Support Desk Widget */}
      {data?.tenant?.id && data?.actingUser?.id && (
        <SupportWidget tenantId={data.tenant.id} userId={data.actingUser.id} />
      )}
    </div>
  );
}
