"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Building,
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  LogOut,
  MessageSquare,
  Search,
  Send,
  Lock,
  Unlock,
  ChevronRight,
  Filter,
  Check,
  Sliders,
  ExternalLink,
  Palette,
  RotateCcw,
  Save,
  Sparkles,
  Smartphone,
  Eye,
  Target,
  MapPin,
  Mail,
  PhoneCall,
  Edit3,
  X,
} from "lucide-react";
import { useBrand } from "@/components/BrandProvider";
import { BrandLogo } from "@/components/BrandLogo";
import { PlatformBranding, DEFAULT_BRANDING_CONFIG } from "@/lib/branding";

interface TenantData {
  id: string;
  companyName: string;
  adminEmail: string;
  adminDesignation: string;
  adminContactNumber: string;
  declaredEmployeeCount: number;
  actualUserCount: number;
  planTier: string;
  billingCycle: string;
  pricePerUserInr: number;
  subscriptionStatus: "ACTIVE" | "PENDING_PAYMENT" | "SUSPENDED" | "CANCELLED";
  isTeamSetupUnlocked: boolean;
  operatingState: string;
  industryType: string;
  onboardingStep: number;
  onboardingStepLabel: string;
  createdAt: string;
}

interface PaymentLog {
  id: string;
  tenantId: string;
  companyName: string;
  adminEmail: string;
  gatewayProvider: string;
  gatewayOrderId: string;
  gatewayPaymentId: string | null;
  amountInr: number;
  planTier: string;
  billingCycle: string;
  employeeCount: number;
  status: string;
  createdAt: string;
}

interface TicketMessage {
  id: string;
  senderRole: string;
  senderName: string;
  message: string;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  tenantId: string;
  companyName: string;
  creatorName: string;
  creatorEmail: string;
  subject: string;
  category: string;
  priority: string;
  status: "OPEN" | "IN_PROGRESS" | "WAITING_ON_TENANT" | "RESOLVED" | "CLOSED";
  messagesCount: number;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

interface MarketingSimulationLeadData {
  id: string;
  businessEmail: string;
  organisationName: string;
  city: string;
  state: string;
  country: string;
  employeeCount: number;
  recommendedTier: string;
  configuredIndustry: string;
  selectedModulesJson: string[] | any;
  unlockedSimulator: boolean;
  status: "NEW_LEAD" | "CONTACTED" | "DEMO_SCHEDULED" | "CONVERTED_TO_TENANT" | "ARCHIVED";
  superAdminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

const THEME_PRESETS = [
  {
    name: "Orbital Enterprise (Default)",
    desc: "Cosmic Deep Blue with Emerald accents and Plus Jakarta typography",
    values: {
      commandBgHex: "#0B1120",
      primaryColorHex: "#2563EB",
      accentColorHex: "#10B981",
      surfaceBgHex: "#F8FAFC",
      coldBadgeHex: "#3B82F6",
      warmBadgeHex: "#F59E0B",
      hotBadgeHex: "#EF4444",
      headingFontFamily: "Plus Jakarta Sans",
      monoFontFamily: "JetBrains Mono",
    },
  },
  {
    name: "Executive Indigo & Gold",
    desc: "Refined Indigo palette with gold warmth for premium corporate tiers",
    values: {
      commandBgHex: "#0F172A",
      primaryColorHex: "#6366F1",
      accentColorHex: "#F59E0B",
      surfaceBgHex: "#FFFFFF",
      coldBadgeHex: "#38BDF8",
      warmBadgeHex: "#FBBF24",
      hotBadgeHex: "#F43F5E",
      headingFontFamily: "Inter",
      monoFontFamily: "JetBrains Mono",
    },
  },
  {
    name: "Emerald FinTech",
    desc: "Vibrant emerald green with clean high-contrast surfaces",
    values: {
      commandBgHex: "#064E3B",
      primaryColorHex: "#059669",
      accentColorHex: "#10B981",
      surfaceBgHex: "#F0FDF4",
      coldBadgeHex: "#34D399",
      warmBadgeHex: "#F59E0B",
      hotBadgeHex: "#E11D48",
      headingFontFamily: "Inter",
      monoFontFamily: "JetBrains Mono",
    },
  },
  {
    name: "Slate & Royal Violet",
    desc: "Futuristic violet theme with cyan accents for AI-first ops",
    values: {
      commandBgHex: "#1E1B4B",
      primaryColorHex: "#7C3AED",
      accentColorHex: "#06B6D4",
      surfaceBgHex: "#F5F3FF",
      coldBadgeHex: "#818CF8",
      warmBadgeHex: "#FBBF24",
      hotBadgeHex: "#F43F5E",
      headingFontFamily: "Plus Jakarta Sans",
      monoFontFamily: "JetBrains Mono",
    },
  },
];

export default function SuperAdminPortalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"tenants" | "sales" | "tickets" | "branding" | "leads">("tenants");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kpis, setKpis] = useState<any>(null);
  const [funnelCounts, setFunnelCounts] = useState<any>(null);
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Marketing Simulation Leads (Phase 9)
  const [marketingLeads, setMarketingLeads] = useState<MarketingSimulationLeadData[]>([]);
  const [editingLead, setEditingLead] = useState<MarketingSimulationLeadData | null>(null);
  const [leadNotesInput, setLeadNotesInput] = useState("");
  const [leadActionLoading, setLeadActionLoading] = useState(false);
  const [leadsSearchTerm, setLeadsSearchTerm] = useState("");
  const [leadsStatusFilter, setLeadsStatusFilter] = useState("ALL");

  // Dynamic Branding State
  const { branding: globalBranding, refreshBranding } = useBrand();
  const [brandForm, setBrandForm] = useState<PlatformBranding>(globalBranding || DEFAULT_BRANDING_CONFIG);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandMessage, setBrandMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (globalBranding) {
      setBrandForm(globalBranding);
    }
  }, [globalBranding]);

  // Ticket detail drawer
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [newTicketStatus, setNewTicketStatus] = useState<string>("");
  const [ticketActionLoading, setTicketActionLoading] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadData = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/overview");
      if (res.status === 401) {
        router.push("/super-admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load overview");

      setKpis(data.kpis);
      setFunnelCounts(data.funnelCounts);
      setTenants(data.tenants || []);
      setPaymentLogs(data.paymentLogs || []);
      setTickets(data.supportTickets || []);
      setMarketingLeads(data.marketingLeads || []);

      if (selectedTicket) {
        const freshTicket = data.supportTickets?.find((t: SupportTicket) => t.id === selectedTicket.id);
        if (freshTicket) setSelectedTicket(freshTicket);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch Super Admin data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/super-admin/auth/logout", { method: "POST" });
    router.push("/super-admin/login");
  };

  const handleUpdateLead = async (leadId: string, status?: string, notes?: string) => {
    setLeadActionLoading(true);
    try {
      const res = await fetch("/api/super-admin/marketing-leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          ...(status ? { status } : {}),
          ...(notes !== undefined ? { superAdminNotes: notes } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update lead");
      setMarketingLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, ...data.lead } : l))
      );
      if (editingLead && editingLead.id === leadId) {
        setEditingLead(data.lead);
      }
    } catch (err: any) {
      alert(err.message || "Failed to update marketing lead");
    } finally {
      setLeadActionLoading(false);
    }
  };

  const handleToggleTenantStatus = async (tenant: TenantData) => {
    const nextStatus = tenant.subscriptionStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionStatus: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
      } else {
        alert(data.error || "Update failed");
      }
    } catch {
      alert("Error updating tenant status");
    }
  };

  const handleToggleUnlockSetup = async (tenant: TenantData) => {
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTeamSetupUnlocked: !tenant.isTeamSetupUnlocked }),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
      } else {
        alert(data.error || "Update failed");
      }
    } catch {
      alert("Error updating team setup status");
    }
  };

  const handleSendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || (!replyMessage.trim() && !newTicketStatus)) return;
    setTicketActionLoading(true);
    try {
      const body: any = {};
      if (replyMessage.trim()) body.replyMessage = replyMessage.trim();
      if (newTicketStatus) body.status = newTicketStatus;

      const res = await fetch(`/api/super-admin/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setReplyMessage("");
        setNewTicketStatus("");
        setSelectedTicket(data.ticket);
        await loadData();
      } else {
        alert(data.error || "Failed to update ticket");
      }
    } catch {
      alert("Error updating ticket");
    } finally {
      setTicketActionLoading(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setBrandSaving(true);
    setBrandMessage(null);
    try {
      const res = await fetch("/api/super-admin/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brandForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update branding");
      }
      setBrandForm(data.branding);
      await refreshBranding();
      setBrandMessage({ text: "Platform branding and UI theme updated live across all dashboards!", type: "success" });
    } catch (err: any) {
      setBrandMessage({ text: err.message || "Failed to save brand settings", type: "error" });
    } finally {
      setBrandSaving(false);
    }
  };

  const handleResetBranding = async () => {
    if (!confirm("Are you sure you want to reset branding to Orbital Enterprise defaults?")) return;
    setBrandSaving(true);
    setBrandMessage(null);
    try {
      const res = await fetch("/api/super-admin/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isReset: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to reset branding");
      }
      setBrandForm(data.branding);
      await refreshBranding();
      setBrandMessage({ text: "Reset to Orbital Enterprise defaults completed!", type: "success" });
    } catch (err: any) {
      setBrandMessage({ text: err.message || "Failed to reset brand settings", type: "error" });
    } finally {
      setBrandSaving(false);
    }
  };

  const applyPreset = (presetValues: Partial<PlatformBranding>) => {
    setBrandForm((prev) => ({
      ...prev,
      ...presetValues,
    }));
    setBrandMessage({ text: "Theme preset applied to draft! Click 'Save Brand Settings' to publish.", type: "success" });
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.adminEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      statusFilter === "ALL" || t.subscriptionStatus === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link href="/">
            <BrandLogo variant="dark" size="sm" />
          </Link>
          <div className="hidden sm:block border-l border-slate-800 pl-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs tracking-wide text-white">SaaS Control Plane</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                LAYER 00 SUPER ADMIN
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Cross-Tenant Governance, Billing & Theme Studio</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 text-red-300 rounded-lg text-xs font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* KPI Stats Ribbon */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Total Tenants</span>
              <Building className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-xl font-bold text-white">{kpis?.totalTenants ?? 0}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{kpis?.activeTenants ?? 0} Active Subscriptions</p>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Paid Seats Sold</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-xl font-bold text-white">{kpis?.totalSeats ?? 0}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Across active tenants</p>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Monthly MRR</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-emerald-400">₹{(kpis?.mrrInr ?? 0).toLocaleString("en-IN")}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Normalized monthly run rate</p>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Annual ARR</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-white">₹{(kpis?.arrInr ?? 0).toLocaleString("en-IN")}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Annualized baseline</p>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Support Queue</span>
              <MessageSquare className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xl font-bold text-amber-400">{kpis?.openTicketsCount ?? 0}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Open & In-Progress</p>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Fully Configured</span>
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-xl font-bold text-white">{funnelCounts?.step4FullyConfigured ?? 0}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Completed 4-step funnel</p>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Simulation Leads</span>
              <Target className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-xl font-bold text-purple-400">{marketingLeads.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Captured from homepage</p>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/40 px-6 gap-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab("tenants")}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "tenants"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Building className="w-4 h-4" />
          Tenants & Onboarding Funnel ({tenants.length})
        </button>
        <button
          onClick={() => setActiveTab("sales")}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "sales"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          SaaS Sales & Payment Ledger ({paymentLogs.length})
        </button>
        <button
          onClick={() => setActiveTab("tickets")}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "tickets"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Central Support Inbox ({tickets.length})
        </button>
        <button
          onClick={() => setActiveTab("leads")}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "leads"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Target className="w-4 h-4" />
          Marketing & Simulation Leads ({marketingLeads.length})
        </button>
        <button
          onClick={() => setActiveTab("branding")}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "branding"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Palette className="w-4 h-4" />
          Brand & UI Theme Studio
        </button>
      </div>

      {/* Content Area */}
      <main className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
            Loading control plane telemetry...
          </div>
        ) : (
          <>
            {/* TAB 1: TENANTS & ONBOARDING FUNNEL */}
            {activeTab === "tenants" && (
              <div className="space-y-6">
                {/* Visual Onboarding Funnel */}
                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                    Self-Service Onboarding Funnel Progression
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-950/80 border border-amber-500/20 rounded-xl">
                      <div className="text-[11px] font-semibold text-amber-400 mb-1">Step 1: Registered</div>
                      <p className="text-xl font-bold text-white">{funnelCounts?.step1PendingPayment ?? 0}</p>
                      <p className="text-[11px] text-slate-400">Payment pending / Cart drop</p>
                    </div>
                    <div className="p-3 bg-slate-950/80 border border-blue-500/20 rounded-xl">
                      <div className="text-[11px] font-semibold text-blue-400 mb-1">Step 2: Paid (Awaiting Setup)</div>
                      <p className="text-xl font-bold text-white">{funnelCounts?.step2PaymentVerified ?? 0}</p>
                      <p className="text-[11px] text-slate-400">Razorpay verified, org locked</p>
                    </div>
                    <div className="p-3 bg-slate-950/80 border border-purple-500/20 rounded-xl">
                      <div className="text-[11px] font-semibold text-purple-400 mb-1">Step 3: Dept Heads Invited</div>
                      <p className="text-xl font-bold text-white">{funnelCounts?.step3DeptHeadsInvited ?? 0}</p>
                      <p className="text-[11px] text-slate-400">Layer 02 invitations sent</p>
                    </div>
                    <div className="p-3 bg-slate-950/80 border border-emerald-500/20 rounded-xl">
                      <div className="text-[11px] font-semibold text-emerald-400 mb-1">Step 4: Fully Configured</div>
                      <p className="text-xl font-bold text-white">{funnelCounts?.step4FullyConfigured ?? 0}</p>
                      <p className="text-[11px] text-slate-400">Active zones & field teams</p>
                    </div>
                  </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search company or admin email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                    <span className="text-slate-400">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="PENDING_PAYMENT">Pending Payment</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Tenants Table */}
                <div className="border border-slate-800 bg-slate-900/60 rounded-2xl overflow-hidden shadow-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Tenant / Organization</th>
                        <th className="px-4 py-3">Admin Contact</th>
                        <th className="px-4 py-3">Plan / Cycle</th>
                        <th className="px-4 py-3">Seats</th>
                        <th className="px-4 py-3">Onboarding Funnel</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredTenants.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-500">
                            No matching tenants found.
                          </td>
                        </tr>
                      ) : (
                        filteredTenants.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-850/40 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-white">{t.companyName}</div>
                              <div className="text-[11px] text-slate-400">{t.operatingState} • {t.industryType}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-slate-200">{t.adminEmail}</div>
                              <div className="text-[11px] text-slate-400">{t.adminContactNumber} ({t.adminDesignation})</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-cyan-400">{t.planTier}</div>
                              <div className="text-[11px] text-slate-400">
                                {t.billingCycle} • ₹{t.pricePerUserInr}/user
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-white">
                                {t.actualUserCount} / {t.declaredEmployeeCount}
                              </div>
                              <div className="text-[11px] text-slate-400">Active / Paid Seats</div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                                  t.onboardingStep === 4
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : t.onboardingStep === 3
                                    ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                                    : t.onboardingStep === 2
                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                }`}
                              >
                                Step {t.onboardingStep}: {t.onboardingStepLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  t.subscriptionStatus === "ACTIVE"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : t.subscriptionStatus === "SUSPENDED"
                                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                }`}
                              >
                                {t.subscriptionStatus}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleToggleUnlockSetup(t)}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                                  title={t.isTeamSetupUnlocked ? "Lock Team Setup" : "Force Unlock Team Setup"}
                                >
                                  {t.isTeamSetupUnlocked ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                                </button>
                                <button
                                  onClick={() => handleToggleTenantStatus(t)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                                    t.subscriptionStatus === "ACTIVE"
                                      ? "bg-red-950/40 hover:bg-red-900/40 text-red-400 border-red-800/40"
                                      : "bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border-emerald-800/40"
                                  }`}
                                >
                                  {t.subscriptionStatus === "ACTIVE" ? "Suspend" : "Activate"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: SAAS SALES & PAYMENT LEDGER */}
            {activeTab === "sales" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white">Platform Payment Transactions Ledger</h3>
                    <p className="text-xs text-slate-400">Direct gateway logs from Razorpay checkout activations</p>
                  </div>
                  <span className="text-xs text-slate-400">Total Recorded: {paymentLogs.length} events</span>
                </div>

                <div className="border border-slate-800 bg-slate-900/60 rounded-2xl overflow-hidden shadow-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Tenant Organization</th>
                        <th className="px-4 py-3">Gateway / Order ID</th>
                        <th className="px-4 py-3">Plan / Seats</th>
                        <th className="px-4 py-3">Amount (INR)</th>
                        <th className="px-4 py-3">Payment ID</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {paymentLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-500 font-sans">
                            No payment transactions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        paymentLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-850/40 transition-colors">
                            <td className="px-4 py-3 text-slate-400">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 font-sans font-semibold text-white">
                              {log.companyName}
                            </td>
                            <td className="px-4 py-3 text-cyan-400">
                              {log.gatewayProvider}: {log.gatewayOrderId}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {log.planTier} ({log.billingCycle}) • {log.employeeCount} seats
                            </td>
                            <td className="px-4 py-3 font-bold text-emerald-400">
                              ₹{log.amountInr.toLocaleString("en-IN")}
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {log.gatewayPaymentId || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.status === "SUCCESS"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : log.status === "INITIATED"
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: CENTRAL SUPPORT INBOX */}
            {activeTab === "tickets" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Tickets Master List */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center justify-between pb-2">
                    <h3 className="text-sm font-bold text-white">Tenant Tickets Queue</h3>
                    <span className="text-xs text-slate-400">{tickets.length} total</span>
                  </div>

                  <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
                    {tickets.length === 0 ? (
                      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
                        No support tickets found across tenants.
                      </div>
                    ) : (
                      tickets.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setSelectedTicket(t);
                            setNewTicketStatus(t.status);
                          }}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            selectedTicket?.id === t.id
                              ? "bg-cyan-950/40 border-cyan-500/50 shadow-lg shadow-cyan-950/50"
                              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-xs font-bold text-cyan-400">{t.ticketNumber}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.status === "OPEN"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : t.status === "RESOLVED"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">{t.subject}</h4>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                            <span>{t.companyName}</span>
                            <span className="text-slate-500">{t.messagesCount} msgs</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Ticket Conversation Detail */}
                <div className="lg:col-span-7">
                  {selectedTicket ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[700px] overflow-hidden shadow-2xl">
                      {/* Ticket Header */}
                      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-cyan-400">{selectedTicket.ticketNumber}</span>
                            <span className="text-slate-400 text-xs">• {selectedTicket.companyName}</span>
                          </div>
                          <h3 className="font-semibold text-sm text-slate-100 mt-1">{selectedTicket.subject}</h3>
                          <p className="text-[11px] text-slate-400">
                            Raised by {selectedTicket.creatorName} ({selectedTicket.creatorEmail})
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={newTicketStatus || selectedTicket.status}
                            onChange={(e) => setNewTicketStatus(e.target.value)}
                            className="bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                          >
                            <option value="OPEN">OPEN</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="WAITING_ON_TENANT">WAITING_ON_TENANT</option>
                            <option value="RESOLVED">RESOLVED</option>
                            <option value="CLOSED">CLOSED</option>
                          </select>
                        </div>
                      </div>

                      {/* Messages Thread */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/40">
                        {selectedTicket.messages.map((m) => {
                          const isSuperAdmin = m.senderRole === "SUPER_ADMIN";
                          return (
                            <div
                              key={m.id}
                              className={`flex flex-col ${isSuperAdmin ? "items-end" : "items-start"}`}
                            >
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1">
                                <span className={`font-semibold ${isSuperAdmin ? "text-cyan-400" : "text-slate-300"}`}>
                                  {m.senderName} {isSuperAdmin ? "(Platform Support)" : ""}
                                </span>
                                <span>•</span>
                                <span>{new Date(m.createdAt).toLocaleString()}</span>
                              </div>
                              <div
                                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                                  isSuperAdmin
                                    ? "bg-cyan-600 text-white rounded-tr-sm"
                                    : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm"
                                }`}
                              >
                                {m.message}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Super Admin Reply Bar */}
                      <form onSubmit={handleSendTicketReply} className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
                        <textarea
                          rows={2}
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder="Type an official platform response to the tenant administrator..."
                          className="w-full bg-slate-900 border border-slate-750 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                        />
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] text-slate-500">
                            Updates status & delivers message to tenant in-app widget
                          </span>
                          <button
                            type="submit"
                            disabled={ticketActionLoading || (!replyMessage.trim() && !newTicketStatus)}
                            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {ticketActionLoading ? "Saving..." : "Send Reply & Update Status"}
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="h-[700px] border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 bg-slate-900/20">
                      <MessageSquare className="w-10 h-10 mb-2 text-slate-600" />
                      <p className="text-sm font-medium">Select a ticket from the left to view the thread</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: BRAND & UI THEME STUDIO */}
            {activeTab === "branding" && (
              <div className="space-y-8 max-w-7xl">
                {/* Header & Description */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Palette className="w-5 h-5 text-cyan-400" />
                      Dynamic Brand & UI Theme Studio
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Customize platform name, typography, logo, and color systems live across all customer tenants without redeployment.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetBranding}
                      disabled={brandSaving}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset to Orbital Defaults
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBranding}
                      disabled={brandSaving}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-900/30 transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {brandSaving ? "Publishing..." : "Save Brand Settings"}
                    </button>
                  </div>
                </div>

                {brandMessage && (
                  <div
                    className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
                      brandMessage.type === "success"
                        ? "bg-emerald-950/60 border border-emerald-800 text-emerald-300"
                        : "bg-red-950/60 border border-red-800 text-red-300"
                    }`}
                  >
                    {brandMessage.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    )}
                    <span>{brandMessage.text}</span>
                  </div>
                )}

                {/* Theme Presets Ribbon */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      One-Click Theme Presets
                    </span>
                    <span className="text-[11px] text-slate-500">Click any preset to load its complete color & typography matrix</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {THEME_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(preset.values)}
                        className="text-left p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: preset.values.primaryColorHex }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: preset.values.accentColorHex }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: preset.values.commandBgHex }}
                          />
                        </div>
                        <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {preset.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {preset.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Studio Workspace: Live Preview on Left, Form on Right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Live Interactive Preview (5 cols) */}
                  <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        Live Theme Simulation Preview
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono">
                        Instant Preview
                      </span>
                    </div>

                    {/* Simulated Command Dashboard Card */}
                    <div
                      className="rounded-3xl border border-slate-700/60 overflow-hidden shadow-2xl transition-all"
                      style={{
                        backgroundColor: brandForm.commandBgHex,
                        fontFamily: `"${brandForm.headingFontFamily}", sans-serif`,
                      }}
                    >
                      {/* Simulated Navigation Bar */}
                      <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Mini dynamic SVG logo preview */}
                          <div className="w-8 h-8 relative flex items-center justify-center">
                            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                              <circle cx="50" cy="50" r="44" stroke={brandForm.primaryColorHex} strokeWidth="3" strokeDasharray="6 4" opacity="0.6" />
                              <circle cx="50" cy="50" r="34" stroke={brandForm.accentColorHex} strokeWidth="2.5" opacity="0.9" />
                              <circle cx="50" cy="50" r="24" fill={brandForm.primaryColorHex} fillOpacity="0.25" />
                              <circle cx="50" cy="6" r="5" fill={brandForm.accentColorHex} />
                              <circle cx="86" cy="50" r="4" fill={brandForm.primaryColorHex} />
                              <text x="50" y="58" textAnchor="middle" fill="#FFFFFF" fontSize="26" fontWeight="900">
                                {brandForm.platformName ? brandForm.platformName.charAt(0).toUpperCase() : "K"}
                              </text>
                            </svg>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-white font-extrabold text-sm tracking-tight">
                                {brandForm.platformName}
                              </span>
                              {brandForm.badgeText && (
                                <span
                                  className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded"
                                  style={{
                                    backgroundColor: `${brandForm.primaryColorHex}25`,
                                    color: brandForm.primaryColorHex,
                                    border: `1px solid ${brandForm.primaryColorHex}50`,
                                  }}
                                >
                                  {brandForm.badgeText}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              {brandForm.tagline}
                            </span>
                          </div>
                        </div>

                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${brandForm.accentColorHex}20`,
                            color: brandForm.accentColorHex,
                          }}
                        >
                          LIVE PERSPECTIVE
                        </span>
                      </div>

                      {/* Simulated Card Surface */}
                      <div className="p-5 space-y-4">
                        <div
                          className="rounded-2xl p-4 shadow-sm border border-black/5"
                          style={{ backgroundColor: brandForm.surfaceBgHex }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                                Annual ARR Telemetry
                              </span>
                              <div className="text-2xl font-black text-slate-900 mt-0.5">
                                ₹4,80,000
                              </div>
                            </div>
                            <span
                              className="text-xs px-2 py-0.5 rounded-md font-mono font-bold"
                              style={{
                                backgroundColor: `${brandForm.accentColorHex}20`,
                                color: brandForm.accentColorHex,
                              }}
                            >
                              +24.5%
                            </span>
                          </div>

                          {/* Status Badge Previews */}
                          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200">
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-md font-bold text-white shadow-xs"
                              style={{ backgroundColor: brandForm.coldBadgeHex }}
                            >
                              COLD LEAD
                            </span>
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-md font-bold text-white shadow-xs"
                              style={{ backgroundColor: brandForm.warmBadgeHex }}
                            >
                              WARM DEAL
                            </span>
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-md font-bold text-white shadow-xs"
                              style={{ backgroundColor: brandForm.hotBadgeHex }}
                            >
                              HOT NEGOTIATION
                            </span>
                          </div>
                        </div>

                        {/* Interactive Buttons Simulation */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <button
                            type="button"
                            className="py-2.5 px-3 rounded-xl text-xs font-bold text-white shadow-md text-center transition-transform hover:scale-[1.02]"
                            style={{ backgroundColor: brandForm.primaryColorHex }}
                          >
                            Primary Action
                          </button>
                          <button
                            type="button"
                            className="py-2.5 px-3 rounded-xl text-xs font-bold text-white shadow-md text-center transition-transform hover:scale-[1.02]"
                            style={{ backgroundColor: brandForm.accentColorHex }}
                          >
                            Accent Action
                          </button>
                        </div>

                        {/* Dynamic Footer / PDF Notice Simulation */}
                        <div className="text-center pt-2 border-t border-white/10">
                          <p className="text-[10px] text-slate-400 italic">
                            *Proposal PDF authentic without signature*
                            {brandForm.showPoweredByFooter && (
                              <span> • Powered by {brandForm.platformName} {brandForm.badgeText}</span>
                            )}
                          </p>
                          <p className="text-[9px] text-slate-500 mt-1">
                            {brandForm.footerCopyright}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Full Theme Config Form (7 cols) */}
                  <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                    <form onSubmit={handleSaveBranding} className="space-y-6">
                      {/* SECTION 1: Brand & Identity */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                          <Building className="w-3.5 h-3.5 text-cyan-400" />
                          Platform Brand & Public Identity
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              Platform Brand Name
                            </label>
                            <input
                              type="text"
                              value={brandForm.platformName}
                              onChange={(e) => setBrandForm({ ...brandForm, platformName: e.target.value })}
                              required
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              High-Tech Badge Text
                            </label>
                            <input
                              type="text"
                              value={brandForm.badgeText}
                              onChange={(e) => setBrandForm({ ...brandForm, badgeText: e.target.value })}
                              placeholder="e.g. ABOS, ENTERPRISE"
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Brand Tagline
                          </label>
                          <input
                            type="text"
                            value={brandForm.tagline}
                            onChange={(e) => setBrandForm({ ...brandForm, tagline: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              Support Operations Email
                            </label>
                            <input
                              type="email"
                              value={brandForm.supportEmail}
                              onChange={(e) => setBrandForm({ ...brandForm, supportEmail: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              Footer Copyright Notice
                            </label>
                            <input
                              type="text"
                              value={brandForm.footerCopyright}
                              onChange={(e) => setBrandForm({ ...brandForm, footerCopyright: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* SECTION 2: Logo & Visual Assets */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          Logo Assets & Vector Mark Mode
                        </h3>

                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-white block">
                              Dynamic Vector Orbital SVG Mark
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Renders procedural concentric rings + hierarchy nodes using active brand palette
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={brandForm.useDynamicOrbitalSvg}
                            onChange={(e) => setBrandForm({ ...brandForm, useDynamicOrbitalSvg: e.target.checked })}
                            className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                          />
                        </div>

                        {!brandForm.useDynamicOrbitalSvg && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-300 mb-1">
                                Logo URL (Light Mode)
                              </label>
                              <input
                                type="text"
                                value={brandForm.logoLightUrl || ""}
                                onChange={(e) => setBrandForm({ ...brandForm, logoLightUrl: e.target.value })}
                                placeholder="https://... or /logo.png"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-300 mb-1">
                                Logo URL (Dark Mode)
                              </label>
                              <input
                                type="text"
                                value={brandForm.logoDarkUrl || ""}
                                onChange={(e) => setBrandForm({ ...brandForm, logoDarkUrl: e.target.value })}
                                placeholder="https://... or /logo-dark.png"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Favicon URL (Browser Tab Icon)
                          </label>
                          <input
                            type="text"
                            value={brandForm.faviconUrl || ""}
                            onChange={(e) => setBrandForm({ ...brandForm, faviconUrl: e.target.value })}
                            placeholder="/favicon.ico or URL"
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      {/* SECTION 3: Color Palette Tokens */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                          Color Palette & Visual Tokens (Hex Codes)
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              Command BG Hex
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={brandForm.commandBgHex}
                                onChange={(e) => setBrandForm({ ...brandForm, commandBgHex: e.target.value })}
                                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                              />
                              <input
                                type="text"
                                value={brandForm.commandBgHex}
                                onChange={(e) => setBrandForm({ ...brandForm, commandBgHex: e.target.value })}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              Primary Brand Color
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={brandForm.primaryColorHex}
                                onChange={(e) => setBrandForm({ ...brandForm, primaryColorHex: e.target.value })}
                                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                              />
                              <input
                                type="text"
                                value={brandForm.primaryColorHex}
                                onChange={(e) => setBrandForm({ ...brandForm, primaryColorHex: e.target.value })}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              Accent Glow Color
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={brandForm.accentColorHex}
                                onChange={(e) => setBrandForm({ ...brandForm, accentColorHex: e.target.value })}
                                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                              />
                              <input
                                type="text"
                                value={brandForm.accentColorHex}
                                onChange={(e) => setBrandForm({ ...brandForm, accentColorHex: e.target.value })}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              Surface Light BG Hex
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={brandForm.surfaceBgHex}
                                onChange={(e) => setBrandForm({ ...brandForm, surfaceBgHex: e.target.value })}
                                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                              />
                              <input
                                type="text"
                                value={brandForm.surfaceBgHex}
                                onChange={(e) => setBrandForm({ ...brandForm, surfaceBgHex: e.target.value })}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Call Nature Badges */}
                        <div className="grid grid-cols-3 gap-3 pt-2">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">
                              Cold Badge Hex
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={brandForm.coldBadgeHex}
                                onChange={(e) => setBrandForm({ ...brandForm, coldBadgeHex: e.target.value })}
                                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                              />
                              <input
                                type="text"
                                value={brandForm.coldBadgeHex}
                                onChange={(e) => setBrandForm({ ...brandForm, coldBadgeHex: e.target.value })}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">
                              Warm Badge Hex
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={brandForm.warmBadgeHex}
                                onChange={(e) => setBrandForm({ ...brandForm, warmBadgeHex: e.target.value })}
                                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                              />
                              <input
                                type="text"
                                value={brandForm.warmBadgeHex}
                                onChange={(e) => setBrandForm({ ...brandForm, warmBadgeHex: e.target.value })}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">
                              Hot Badge Hex
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={brandForm.hotBadgeHex}
                                onChange={(e) => setBrandForm({ ...brandForm, hotBadgeHex: e.target.value })}
                                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                              />
                              <input
                                type="text"
                                value={brandForm.hotBadgeHex}
                                onChange={(e) => setBrandForm({ ...brandForm, hotBadgeHex: e.target.value })}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 4: Typography & Fonts */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          Typography Fonts
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              Heading Font Family
                            </label>
                            <select
                              value={brandForm.headingFontFamily}
                              onChange={(e) => setBrandForm({ ...brandForm, headingFontFamily: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                            >
                              <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                              <option value="Inter">Inter</option>
                              <option value="Roboto">Roboto</option>
                              <option value="Montserrat">Montserrat</option>
                              <option value="Poppins">Poppins</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              Monospace Code Font Family
                            </label>
                            <select
                              value={brandForm.monoFontFamily}
                              onChange={(e) => setBrandForm({ ...brandForm, monoFontFamily: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            >
                              <option value="JetBrains Mono">JetBrains Mono</option>
                              <option value="Fira Code">Fira Code</option>
                              <option value="Source Code Pro">Source Code Pro</option>
                              <option value="Courier New">Courier New</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 5: Enterprise Stage 4 PDF & Footer Flags */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                          Enterprise Stage 4 PDF & Footer Flags
                        </h3>

                        <div className="space-y-2">
                          <label className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                            <input
                              type="checkbox"
                              checked={brandForm.allowTenantPdfLogo}
                              onChange={(e) => setBrandForm({ ...brandForm, allowTenantPdfLogo: e.target.checked })}
                              className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-semibold text-white block">
                                Allow Tenant Custom Logos in Stage 4 GST Proposal PDFs
                              </span>
                              <span className="text-[11px] text-slate-400">
                                When enabled, customer tenants can display their registered corporate logo on exportable proposal PDFs
                              </span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                            <input
                              type="checkbox"
                              checked={brandForm.showPoweredByFooter}
                              onChange={(e) => setBrandForm({ ...brandForm, showPoweredByFooter: e.target.checked })}
                              className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-semibold text-white block">
                                Show &apos;Powered by {brandForm.platformName}&apos; in Footers & PDF Documents
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Displays subtle platform watermark on proposal exports and public pages
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={handleResetBranding}
                          disabled={brandSaving}
                          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reset to Defaults
                        </button>
                        <button
                          type="submit"
                          disabled={brandSaving}
                          className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-900/40 transition-all cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          {brandSaving ? "Publishing Changes..." : "Publish Live Branding"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: MARKETING & SIMULATION LEADS */}
            {activeTab === "leads" && (
              <div className="space-y-6">
                {/* Header & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-400" />
                      Marketing & Interactive Simulation Leads
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Prospective commercial leads generated through public solution configurator and gated simulator previews.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold text-purple-400 bg-purple-950/60 border border-purple-800/80 px-3 py-1.5 rounded-xl">
                      {marketingLeads.length} Captured Leads
                    </span>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-4 border border-slate-800 rounded-2xl">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search organisation, email, city..."
                      value={leadsSearchTerm}
                      onChange={(e) => setLeadsSearchTerm(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-xs text-slate-400 whitespace-nowrap">Status Filter:</span>
                    <select
                      value={leadsStatusFilter}
                      onChange={(e) => setLeadsStatusFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="ALL">All Statuses ({marketingLeads.length})</option>
                      <option value="NEW_LEAD">New Lead</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="DEMO_SCHEDULED">Demo Scheduled</option>
                      <option value="CONVERTED_TO_TENANT">Converted to Tenant</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>

                {/* Leads Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <th className="py-3.5 px-4 font-semibold">Organisation & Email</th>
                          <th className="py-3.5 px-4 font-semibold">Territory</th>
                          <th className="py-3.5 px-4 font-semibold">Employees & Tier</th>
                          <th className="py-3.5 px-4 font-semibold">Configured Solution</th>
                          <th className="py-3.5 px-4 font-semibold">Lead Status</th>
                          <th className="py-3.5 px-4 font-semibold">Captured Date</th>
                          <th className="py-3.5 px-4 text-right font-semibold">Actions / Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {marketingLeads
                          .filter((l) => {
                            const term = leadsSearchTerm.toLowerCase();
                            const matchesSearch =
                              l.organisationName.toLowerCase().includes(term) ||
                              l.businessEmail.toLowerCase().includes(term) ||
                              l.city.toLowerCase().includes(term) ||
                              l.state.toLowerCase().includes(term);
                            const matchesStatus =
                              leadsStatusFilter === "ALL" || l.status === leadsStatusFilter;
                            return matchesSearch && matchesStatus;
                          })
                          .map((lead) => {
                            const statusColor = {
                              NEW_LEAD: "bg-amber-950 text-amber-300 border-amber-800",
                              CONTACTED: "bg-blue-950 text-blue-300 border-blue-800",
                              DEMO_SCHEDULED: "bg-purple-950 text-purple-300 border-purple-800",
                              CONVERTED_TO_TENANT: "bg-emerald-950 text-emerald-300 border-emerald-800",
                              ARCHIVED: "bg-slate-800 text-slate-400 border-slate-700",
                            }[lead.status] || "bg-slate-800 text-slate-300 border-slate-700";

                            const tierBadgeColor = {
                              BASIC: "bg-blue-950/70 text-blue-400 border-blue-800",
                              ADVANCED: "bg-cyan-950/70 text-cyan-400 border-cyan-800",
                              PREMIUM: "bg-purple-950/70 text-purple-400 border-purple-800",
                              ENTERPRISE: "bg-emerald-950/70 text-emerald-400 border-emerald-800",
                            }[lead.recommendedTier] || "bg-slate-800 text-slate-300 border-slate-700";

                            const modules = Array.isArray(lead.selectedModulesJson)
                              ? lead.selectedModulesJson
                              : typeof lead.selectedModulesJson === "string"
                              ? JSON.parse(lead.selectedModulesJson)
                              : [];

                            return (
                              <tr key={lead.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-white text-sm">
                                    {lead.organisationName}
                                  </div>
                                  <div className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5 font-mono">
                                    <Mail className="w-3 h-3 text-slate-500" />
                                    {lead.businessEmail}
                                  </div>
                                  {lead.unlockedSimulator && (
                                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-emerald-400 font-medium">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Simulators Unlocked
                                    </span>
                                  )}
                                </td>

                                <td className="py-3.5 px-4 text-slate-300">
                                  <div className="flex items-center gap-1 font-medium">
                                    <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                                    {lead.city}, {lead.state}
                                  </div>
                                  <span className="text-[11px] text-slate-500 block ml-4">
                                    {lead.country}
                                  </span>
                                </td>

                                <td className="py-3.5 px-4">
                                  <span className="font-bold text-white block">
                                    {lead.employeeCount} Employees
                                  </span>
                                  <span
                                    className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded border mt-1 ${tierBadgeColor}`}
                                  >
                                    Tier: {lead.recommendedTier}
                                  </span>
                                </td>

                                <td className="py-3.5 px-4">
                                  <span className="text-slate-200 font-medium block">
                                    {lead.configuredIndustry}
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {modules.map((m: string) => (
                                      <span
                                        key={m}
                                        className="text-[9px] bg-slate-950 border border-slate-700 text-slate-300 px-1.5 py-0.2 rounded"
                                      >
                                        {m}
                                      </span>
                                    ))}
                                  </div>
                                </td>

                                <td className="py-3.5 px-4">
                                  <select
                                    value={lead.status}
                                    onChange={(e) => handleUpdateLead(lead.id, e.target.value)}
                                    disabled={leadActionLoading}
                                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${statusColor}`}
                                  >
                                    <option value="NEW_LEAD">NEW LEAD</option>
                                    <option value="CONTACTED">CONTACTED</option>
                                    <option value="DEMO_SCHEDULED">DEMO SCHEDULED</option>
                                    <option value="CONVERTED_TO_TENANT">CONVERTED TO TENANT</option>
                                    <option value="ARCHIVED">ARCHIVED</option>
                                  </select>
                                </td>

                                <td className="py-3.5 px-4 text-slate-400 text-xs font-mono">
                                  {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </td>

                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    onClick={() => {
                                      setEditingLead(lead);
                                      setLeadNotesInput(lead.superAdminNotes || "");
                                    }}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                                    {lead.superAdminNotes ? "Edit Notes" : "Add Notes"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {marketingLeads.length === 0 && (
                    <div className="p-12 text-center text-slate-500 text-xs">
                      No simulation leads captured yet. Leads captured on the homepage will appear here automatically.
                    </div>
                  )}
                </div>

                {/* Notes Editor Modal */}
                {editingLead && (
                  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="text-base font-bold text-white">
                            Lead Follow-Up Notes
                          </h3>
                          <p className="text-xs text-slate-400">
                            {editingLead.organisationName} • {editingLead.businessEmail}
                          </p>
                        </div>
                        <button
                          onClick={() => setEditingLead(null)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="text-xs text-slate-300 grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono">
                          <div>
                            <span className="text-slate-500 block">Territory:</span>
                            {editingLead.city}, {editingLead.state}
                          </div>
                          <div>
                            <span className="text-slate-500 block">Recommended Tier:</span>
                            {editingLead.recommendedTier} ({editingLead.employeeCount} users)
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Super Admin Internal Follow-Up Log
                          </label>
                          <textarea
                            rows={4}
                            value={leadNotesInput}
                            onChange={(e) => setLeadNotesInput(e.target.value)}
                            placeholder="Enter notes on demo call, custom pricing negotiation, dealer expansion requirements..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingLead(null)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={leadActionLoading}
                          onClick={async () => {
                            await handleUpdateLead(editingLead.id, undefined, leadNotesInput);
                            setEditingLead(null);
                          }}
                          className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-900/30 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {leadActionLoading ? "Saving..." : "Save Notes"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
