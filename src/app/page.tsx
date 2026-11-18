"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  TrendingUp,
  Smartphone,
  Building2,
  Users,
  Percent,
  Sparkles,
  ArrowRight,
  Lock,
  Unlock,
  Layers,
  MapPin,
  CheckCircle2,
  Car,
  FileText,
  Mic,
  Cpu,
  Receipt,
  HelpCircle,
  ExternalLink,
  Briefcase,
  Activity,
  Check,
  X,
  ChevronRight,
  Sliders,
  DollarSign,
  AlertCircle,
  Clock,
  Factory,
  Truck,
  Wrench,
  Megaphone,
  UserCheck,
  Compass,
  Play,
  RotateCcw,
} from "lucide-react";
import { calculatePricing } from "@/lib/pricing";
import { BillingCycle } from "@prisma/client";
import { BrandLogo } from "@/components/BrandLogo";

// ----------------------------------------------------------------------------
// DATA: 6-Stage Autonomous Workflow Explorer
// ----------------------------------------------------------------------------
interface WorkflowStage {
  step: number;
  title: string;
  shortDesc: string;
  inputs: string[];
  engine: string;
  outputs: string[];
  metrics: string;
}

const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    step: 1,
    title: "1. Dynamic Layer Hierarchy & Target Allocation",
    shortDesc: "Automated organizational tree compiled into materialized path coordinates.",
    inputs: ["Enterprise Org Chart", "Territory Boundaries (5 Zones)", "Annual Sales & Revenue Targets"],
    engine: "Dynamic Layer Detection (DLD) Engine + Materialized Path Compiler",
    outputs: ["Subtree Performance Rollups", "Upward Visibility Locks", "Strict Chain-of-Command Matrix"],
    metrics: "Instant zero-schema reorganization",
  },
  {
    step: 2,
    title: "2. Client Intake & Cryptographic Admin Lock",
    shortDesc: "Strict data lock prevents unauthorized field changes with SHA-256 ledger chaining.",
    inputs: ["Client KYC & GSTIN Master", "Geo-Coordinates (Lat/Lng)", "Initial Introductory Meeting Details"],
    engine: "Immutable Cryptographic Audit Ledger + Security Guard Engine",
    outputs: ["Admin Lock Activated", "Automated Client Code Generation", "Correction Request Protocol"],
    metrics: "100% tamper-evident audit trail",
  },
  {
    step: 3,
    title: "3. Field Verification: 100m GPS & AI Voice-to-CRM",
    shortDesc: "DPDP 2023 work-hours geo-fencing + Google Gemini multilingual extraction.",
    inputs: ["Field Executive Sign-In", "100m Client GPS Geo-Fence Radius", "Audio Voice Note (EN/HI/ML)"],
    engine: "DPDP 2023 GPS Privacy Kill-Switch + Gemini 2.5 Structured Extractor",
    outputs: ["Verified Attendance Minutes", "Extracted Deals & Competitor Intel", "Automated Road Allowance (TA)"],
    metrics: "2-second CRM transcription & zero travel fraud",
  },
  {
    step: 4,
    title: "4. One-Click Dual-Jurisdiction GST Proposal Engine",
    shortDesc: "Automatic intra-state vs. inter-state tax splits with signed server-side PDFs.",
    inputs: ["Standardized Product Master", "Tenant vs Client State", "Configured Deliverables & Payment Terms"],
    engine: "Statutory Dual-Jurisdiction GST Tax Engine + PDFKit Generator",
    outputs: ["CGST+SGST or IGST Breakdown", "Legally Binding Proposal PDF", "Automated Stage 4 Pipeline Advance"],
    metrics: "90-second proposal turnaround",
  },
  {
    step: 5,
    title: "5. Dual-Gate Autonomous Discount SLA Desk",
    shortDesc: "Monetary ceiling tiers with 4h–48h automated timeout escalation to senior officers.",
    inputs: ["Field Executive Offered Rate", "Line-Item Margin Ceiling", "Dual-Gate Authority Thresholds"],
    engine: "Autonomous SLA Escalation Daemon + Hard Deny Level Tracker",
    outputs: ["Level 0–4 Approval Routing", "Auto-Escalation upon SLA Expiry", "Margin Protection Lock"],
    metrics: "95% reduction in approval bottlenecks",
  },
  {
    step: 6,
    title: "6. Commercial Handoff & Payroll-Ready Export",
    shortDesc: "Seamless transition from won deals to finance invoicing and HR salary calculations.",
    inputs: ["Won Deal Handshake", "KYC & Signed Acceptance", "Approved Attendance & Travel Mileage"],
    engine: "Commercial Verification Guard + HR Payroll Aggregator",
    outputs: ["Locked Invoice Schedule", "Accounting Ledger Export", "Automated Travel Allowance (TA) Sheet"],
    metrics: "Zero margin leakage from sales to cash",
  },
];

// ----------------------------------------------------------------------------
// DATA: "Who Is KORBIT ABOS Designed For?" Roles
// ----------------------------------------------------------------------------
interface TargetRole {
  id: string;
  layer: string;
  title: string;
  tagline: string;
  painPoints: string[];
  abosSolutions: string[];
  kpiOutcome: string;
}

const TARGET_ROLES: TargetRole[] = [
  {
    id: "layer01",
    layer: "Layer 01",
    title: "CEOs, Managing Directors & Enterprise Owners",
    tagline: "Total Organizational Command & Uncompromised Governance",
    painPoints: [
      "No real-time visibility into whether field teams are actually meeting clients.",
      "Uncontrolled discount leakages eroding gross margins across branches.",
      "Disorganized client data spread across WhatsApp and spreadsheets.",
    ],
    abosSolutions: [
      "Company-wide ARR & MRR run-rate telemetry with subtree performance tracking.",
      "Cryptographic SHA-256 immutable audit ledger certifying every critical edit.",
      "Autonomous Dual-Gate discount desk that enforces company pricing policies automatically.",
    ],
    kpiOutcome: "100% margin transparency & zero deadlocked deals",
  },
  {
    id: "layer02",
    layer: "Layer 02",
    title: "Sales, HR & Commercial Department Heads",
    tagline: "Departmental Velocity Without Manual Paperwork",
    painPoints: [
      "Sales Heads: Trapped in endless manual approval WhatsApp chats for 2% discounts.",
      "HR Heads: Sifting through falsified travel reimbursement claims at month-end.",
      "Commercial Heads: Incomplete proposals missing GST compliance or signed client terms.",
    ],
    abosSolutions: [
      "VP Sales: Automated 4h–48h SLA escalation desk with automatic tier routing.",
      "HR Head: DPDP-compliant 100m client geo-fence check-ins and auto-calculated TA claims.",
      "Commercial Head: Standardized GST PDF generator with mandatory KYC handover checks.",
    ],
    kpiOutcome: "95% faster approvals & statutory compliance",
  },
  {
    id: "layer03-05",
    layer: "Layers 03–05",
    title: "Zone, State & City Regional Managers",
    tagline: "Territory Accountability & Upward Chain-of-Command",
    painPoints: [
      "Inability to monitor multiple city divisions simultaneously.",
      "Field executives claiming client visits without proof of presence.",
      "Delayed feedback on urgent customer proposals losing deals to competitors.",
    ],
    abosSolutions: [
      "Real-time pipeline rollup strictly filtered to authorized geographic subtrees.",
      "Instant push alerts for pending discount reviews before the SLA clock runs out.",
      "Live GPS status indicators respecting employee off-duty privacy.",
    ],
    kpiOutcome: "Real-time territorial accountability",
  },
  {
    id: "layer06",
    layer: "Layer 06",
    title: "Field Sales & Service Executives",
    tagline: "Zero Admin Work: Tap, Speak, and Close Deals",
    painPoints: [
      "Spending 2 hours every evening typing meeting reports and travel logs.",
      "Waiting 3 days for managers to approve a 5% discount while the client cools off.",
      "Friction with HR over disputed travel expense receipts.",
    ],
    abosSolutions: [
      "AI Voice-to-CRM: Dictate 15 seconds in English, Hindi, or Malayalam to log full meeting details.",
      "100m Geo-Fence 1-Tap Check-In: Instant automated travel allowance calculation.",
      "Live discount calculator that shows exact approval SLA before leaving the client's office.",
    ],
    kpiOutcome: "2+ extra client meetings per rep per day",
  },
];

// ----------------------------------------------------------------------------
// DATA: Solution Configurator
// ----------------------------------------------------------------------------
const BUSINESS_TYPES = [
  {
    id: "manufacturing",
    name: "Manufacturing & Industrial",
    icon: Factory,
    desc: "Machinery, industrial chemicals, building materials & heavy fabrication",
    defaultModules: ["Sales", "Manufacturing", "Commercial", "AI"],
  },
  {
    id: "field_sales",
    name: "Field Sales & Service Ops",
    icon: Wrench,
    desc: "Capital equipment servicing, on-site installations & territory reps",
    defaultModules: ["Sales", "Service", "HR", "AI"],
  },
  {
    id: "fmcg",
    name: "FMCG & Multi-State Distribution",
    icon: Truck,
    desc: "Fast-moving consumer goods, regional distributor networks & retail beats",
    defaultModules: ["Sales", "HR", "Commercial"],
  },
  {
    id: "b2b_services",
    name: "B2B Solutions & Enterprise Services",
    icon: Briefcase,
    desc: "Corporate IT, consultancy, financial products & high-ticket contracting",
    defaultModules: ["Sales", "Commercial", "Marketing", "AI"],
  },
];

const AVAILABLE_MODULES = [
  { id: "Sales", label: "Autonomous Sales Force", icon: TrendingUp },
  { id: "Service", label: "Field Service & Tickets", icon: Wrench },
  { id: "Manufacturing", label: "Product & Spec Master", icon: Factory },
  { id: "Marketing", label: "Lead Capture & Funnel", icon: Megaphone },
  { id: "HR", label: "DPDP Attendance & Travel", icon: UserCheck },
  { id: "Commercial", label: "GST Proposals & Invoicing", icon: DollarSign },
  { id: "AI", label: "Gemini Voice-to-CRM", icon: Cpu },
];

export default function HomePage() {
  // Navigation & Calculator State
  const [employeeCount, setEmployeeCount] = useState<number>(45);
  const [organisationName, setOrganisationName] = useState<string>("My Enterprise");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(BillingCycle.ANNUAL);

  // Phase 9: Workflow Explorer State
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(1);

  // Phase 9: Role Switcher State
  const [activeRole, setActiveRole] = useState<string>("layer01");

  // Phase 9: Solution Configurator State
  const [selectedBusiness, setSelectedBusiness] = useState<string>("manufacturing");
  const [selectedModules, setSelectedModules] = useState<string[]>([
    "Sales",
    "Manufacturing",
    "Commercial",
    "AI",
  ]);

  // Phase 9: Lead-Gated Simulator State
  const [isSimulatorUnlocked, setIsSimulatorUnlocked] = useState<boolean>(false);
  const [showLeadModal, setShowLeadModal] = useState<boolean>(false);
  const [leadForm, setLeadForm] = useState({
    businessEmail: "",
    organisationName: "",
    city: "Kochi",
    state: "Kerala",
    country: "India",
    employeeCount: 45,
  });
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  // Simulator 1: Discount SLA Desk State
  const [simOfferedPrice, setSimOfferedPrice] = useState<number>(850);
  const simListPrice = 1000;
  const simDiscountPercent = useMemo(() => {
    return Math.max(0, Math.round(((simListPrice - simOfferedPrice) / simListPrice) * 100));
  }, [simOfferedPrice]);

  const simApprovalRouting = useMemo(() => {
    if (simDiscountPercent <= 5) {
      return { level: "Layer 05: City Manager", sla: "4 Hours", badge: "bg-blue-950 text-blue-300 border-blue-800" };
    } else if (simDiscountPercent <= 10) {
      return { level: "Layer 04: Region Manager", sla: "8 Hours", badge: "bg-cyan-950 text-cyan-300 border-cyan-800" };
    } else if (simDiscountPercent <= 15) {
      return { level: "Layer 03: Zone Manager", sla: "12 Hours", badge: "bg-purple-950 text-purple-300 border-purple-800" };
    } else if (simDiscountPercent <= 20) {
      return { level: "Layer 02: VP Sales / Dept Head", sla: "24 Hours", badge: "bg-amber-950 text-amber-300 border-amber-800" };
    } else {
      return { level: "Layer 01: Managing Director / CEO", sla: "48 Hours", badge: "bg-red-950 text-red-300 border-red-800" };
    }
  }, [simDiscountPercent]);

  // Simulator 2: AI Voice Note State
  const sampleTranscripts = [
    "Met Rajesh at Fosroc in Kochi, they want 500 units of Product A at ₹900 unit price, follow up on Friday afternoon.",
    "Visited UltraTech Cement, spoke with procurement head Suresh, requirements for 1,200 units at 15% discount, need proposal by tomorrow morning.",
  ];
  const [selectedTranscriptIndex, setSelectedTranscriptIndex] = useState(0);
  const [aiSimulationRunning, setAiSimulationRunning] = useState(false);
  const [aiExtractionOutput, setAiExtractionOutput] = useState<any>(null);

  // Check localStorage for simulation unlock status on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const unlocked = localStorage.getItem("korbit_simulator_unlocked") === "true";
      if (unlocked) {
        setIsSimulatorUnlocked(true);
      }
    }
  }, []);

  const handleToggleModule = (modId: string) => {
    setSelectedModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const handleSelectBusiness = (bId: string) => {
    setSelectedBusiness(bId);
    const b = BUSINESS_TYPES.find((item) => item.id === bId);
    if (b) {
      setSelectedModules(b.defaultModules);
    }
  };

  const handleSimulateAi = () => {
    setAiSimulationRunning(true);
    setTimeout(() => {
      if (selectedTranscriptIndex === 0) {
        setAiExtractionOutput({
          clientName: "Fosroc Chemicals",
          contactPerson: "Rajesh",
          city: "Kochi",
          productInterest: "Product A",
          quantity: 500,
          requestedUnitPriceInr: 900,
          suggestedStage: "STAGE_3_NEGOTIATION",
          followUpDate: "2026-11-20 (Friday Afternoon)",
          aiConfidence: "98.4%",
        });
      } else {
        setAiExtractionOutput({
          clientName: "UltraTech Cement",
          contactPerson: "Suresh (Procurement Head)",
          productInterest: "Bulk Building Mix",
          quantity: 1200,
          requestedDiscountPercent: "15%",
          suggestedStage: "STAGE_4_PROPOSAL",
          followUpDate: "Tomorrow 10:00 AM",
          aiConfidence: "99.1%",
        });
      }
      setAiSimulationRunning(false);
    }, 700);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadLoading(true);
    setLeadError(null);

    const b = BUSINESS_TYPES.find((item) => item.id === selectedBusiness);
    const configuredIndustry = b ? b.name : "Manufacturing & Industrial";

    try {
      const res = await fetch("/api/marketing-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...leadForm,
          configuredIndustry,
          selectedModules,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process lead");

      // Unlock simulator
      setIsSimulatorUnlocked(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("korbit_simulator_unlocked", "true");
      }

      // Sync employee count and org name into calculator
      setEmployeeCount(leadForm.employeeCount);
      setOrganisationName(leadForm.organisationName);

      setShowLeadModal(false);
    } catch (err: any) {
      setLeadError(err.message || "Something went wrong");
    } finally {
      setLeadLoading(false);
    }
  };

  const pricing = useMemo(() => {
    return calculatePricing(employeeCount, billingCycle);
  }, [employeeCount, billingCycle]);

  const activeStage = WORKFLOW_STAGES.find((s) => s.step === activeWorkflowStep) || WORKFLOW_STAGES[0];
  const currentRole = TARGET_ROLES.find((r) => r.id === activeRole) || TARGET_ROLES[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-cyan-950 via-blue-950 to-indigo-950 border-b border-cyan-800/40 px-4 py-2 text-center text-xs text-cyan-300 font-medium flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        <span>KORBIT ABOS V1.0 Commercial MVP: Autonomous Business Operating System with DPDP Act 2023 GPS Kill-Switch</span>
        <span className="hidden sm:inline text-cyan-500">•</span>
        <Link href="/register" className="hidden sm:inline font-bold text-white underline hover:text-cyan-200">
          Start Onboarding →
        </Link>
      </div>

      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <BrandLogo variant="dark" size="md" />
          </Link>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <Link href="#workflow" className="px-3 py-2 text-slate-300 hover:text-white transition hidden md:inline">
              6-Stage Engine
            </Link>
            <Link href="#solutions" className="px-3 py-2 text-slate-300 hover:text-white transition hidden md:inline">
              Solutions
            </Link>
            <Link href="#simulators" className="px-3 py-2 text-slate-300 hover:text-white transition hidden md:inline">
              Live Simulator
            </Link>
            <Link href="#pricing" className="px-3 py-2 text-slate-300 hover:text-white transition hidden md:inline">
              Pricing
            </Link>
            <Link
              href="/dashboard/command"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition border border-slate-700"
            >
              Command Center
            </Link>
            <Link
              href={`/register?employees=${employeeCount}&cycle=${billingCycle}`}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl transition shadow-lg shadow-cyan-900/30"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Showcase */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 space-y-24">
        {/* HERO SECTION */}
        <section className="text-center space-y-5 max-w-4xl mx-auto pt-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            The Autonomous Business Operating System
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Stop Sales Leakages with{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Autonomous Governance
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Eliminate operational delays and revenue loss with Dynamic Layer Detection (DLD), Dual-Gate 4h–48h automated discount escalations, DPDP Act 2023 work-hours-only GPS tracking, and Multilingual AI Voice-to-CRM transcription.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <Link
              href={`/register?employees=${employeeCount}&cycle=${billingCycle}`}
              className="px-6 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-2xl text-sm shadow-xl shadow-cyan-900/40 flex items-center gap-2 transition"
            >
              Start 14-Day Free Setup
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#simulators"
              className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold rounded-2xl text-sm transition flex items-center gap-2"
            >
              <Play className="w-4 h-4 text-cyan-400" />
              Try Interactive Simulators
            </a>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 1: END-TO-END 6-STAGE AUTONOMOUS WORKFLOW EXPLORER         */}
        {/* ------------------------------------------------------------------ */}
        <section id="workflow" className="scroll-mt-24 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs uppercase tracking-wider font-extrabold text-cyan-400">
              Interactive Workflow Architecture
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              The 6-Stage Autonomous Business Operating Cycle
            </p>
            <p className="text-xs text-slate-400 max-w-xl mx-auto">
              Click through each stage to examine how KORBIT ABOS ingests raw inputs, executes deterministic business rules, and outputs verified transactions.
            </p>
          </div>

          {/* Stepper Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {WORKFLOW_STAGES.map((st) => (
              <button
                key={st.step}
                type="button"
                onClick={() => setActiveWorkflowStep(st.step)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  activeWorkflowStep === st.step
                    ? "bg-slate-900 border-cyan-500 text-white shadow-lg shadow-cyan-900/20"
                    : "bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                    activeWorkflowStep === st.step ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-400"
                  }`}>
                    0{st.step}
                  </span>
                  {activeWorkflowStep === st.step && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  )}
                </div>
                <h4 className="text-xs font-bold truncate">{st.title.split(". ")[1]}</h4>
              </button>
            ))}
          </div>

          {/* Active Stage Detailed Breakdown (Inputs -> Engine -> Outputs) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                  Stage 0{activeStage.step} of 06
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                  {activeStage.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {activeStage.shortDesc}
                </p>
              </div>
              <div className="shrink-0 bg-cyan-950/60 border border-cyan-800/80 px-4 py-2 rounded-2xl">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Verified Metric</span>
                <span className="text-xs font-bold text-cyan-300">{activeStage.metrics}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 items-stretch">
              {/* Box 1: Inputs */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  1. Operational Inputs
                </span>
                <ul className="space-y-2 text-xs text-slate-300">
                  {activeStage.inputs.map((inp, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                      <span>{inp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Box 2: Autonomous Engine */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-cyan-950/30 to-blue-950/20 border border-cyan-500/30 space-y-3">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  2. ABOS Autonomous Engine
                </span>
                <p className="text-xs text-slate-200 font-semibold leading-relaxed">
                  {activeStage.engine}
                </p>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-800/50 text-[11px] text-slate-400 font-mono">
                  Runtime execution: Deterministic verification & state transition in &lt;100ms
                </div>
              </div>

              {/* Box 3: Outputs */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  3. Verified Ledger Outputs
                </span>
                <ul className="space-y-2 text-xs text-slate-300">
                  {activeStage.outputs.map((out, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{out}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 2: WHO IS KORBIT ABOS DESIGNED FOR? ROLE SWITCHER         */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs uppercase tracking-wider font-extrabold text-cyan-400">
              Role-Specific Accountability
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              Who Is KORBIT ABOS Designed For?
            </p>
            <p className="text-xs text-slate-400 max-w-xl mx-auto">
              Every layer in your enterprise has distinct operational liabilities. Switch perspectives to see how ABOS serves each layer.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl mx-auto">
            {TARGET_ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveRole(r.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeRole === r.id
                    ? "bg-cyan-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {r.layer}: {r.title.split(",")[0]}
              </button>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase">
                  {currentRole.layer} Architecture
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">{currentRole.title}</h3>
                <p className="text-xs text-slate-400">{currentRole.tagline}</p>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold text-xs self-start sm:self-auto">
                {currentRole.kpiOutcome}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              {/* Typical Enterprise Friction */}
              <div className="p-4 bg-slate-950 border border-red-950/60 rounded-2xl space-y-2.5">
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5" />
                  Typical Enterprise Friction
                </span>
                <ul className="space-y-2 text-xs text-slate-300">
                  {currentRole.painPoints.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-500 font-bold">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* The KORBIT ABOS Advantage */}
              <div className="p-4 bg-slate-950 border border-cyan-950/60 rounded-2xl space-y-2.5">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  The KORBIT ABOS Solution
                </span>
                <ul className="space-y-2 text-xs text-slate-300">
                  {currentRole.abosSolutions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 3: BUSINESS & DEPARTMENT SOLUTION CONFIGURATOR             */}
        {/* ------------------------------------------------------------------ */}
        <section id="solutions" className="scroll-mt-24 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs uppercase tracking-wider font-extrabold text-cyan-400">
              Tailored Architecture Matrix
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              Business & Department Solution Configurator
            </p>
            <p className="text-xs text-slate-400 max-w-xl mx-auto">
              Select your business model and toggle the functional departments you operate. KORBIT ABOS dynamically adapts its automated workflows.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8">
            {/* Step 1: Select Business Type */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Step 1: Select Your Business Model
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {BUSINESS_TYPES.map((b) => {
                  const Icon = b.icon;
                  const isSelected = selectedBusiness === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectBusiness(b.id)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-cyan-950/40 border-cyan-500 text-white shadow-lg shadow-cyan-900/20"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-2 ${isSelected ? "text-cyan-400" : "text-slate-500"}`} />
                      <h4 className="text-xs font-bold text-white">{b.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{b.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Toggle Functional Departments */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Step 2: Toggle Active Functional Departments
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_MODULES.map((m) => {
                  const Icon = m.icon;
                  const isActive = selectedModules.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleToggleModule(m.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition cursor-pointer ${
                        isActive
                          ? "bg-blue-950/80 border-blue-500 text-blue-200 shadow-sm"
                          : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-slate-600"}`} />
                      {m.label}
                      {isActive && <Check className="w-3 h-3 text-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Configurator Output: Efficiency Gains (Before vs After) */}
            <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Verified Operational Gains for {BUSINESS_TYPES.find((b) => b.id === selectedBusiness)?.name}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Calculated against standard manual and legacy CRM operations
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300">
                  {selectedModules.length} Modules Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">Discount Approval Turnaround</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-red-400 line-through">5 Days</span>
                    <span className="text-lg font-black text-emerald-400">4 Hours</span>
                  </div>
                  <span className="text-[10px] text-emerald-500 font-mono">-95% Turnaround Delay</span>
                </div>

                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">Lead to Signed Proposal</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-red-400 line-through">48 Hours</span>
                    <span className="text-lg font-black text-emerald-400">90 Seconds</span>
                  </div>
                  <span className="text-[10px] text-emerald-500 font-mono">-98% Proposal Latency</span>
                </div>

                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">Travel Allowance Variance</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-red-400 line-through">24% Fraud</span>
                    <span className="text-lg font-black text-emerald-400">0% Variance</span>
                  </div>
                  <span className="text-[10px] text-emerald-500 font-mono">100m GPS Geo-Fence Verified</span>
                </div>

                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">Unapproved Margin Leak</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-red-400 line-through">8.5% Lost</span>
                    <span className="text-lg font-black text-emerald-400">0% Leakage</span>
                  </div>
                  <span className="text-[10px] text-emerald-500 font-mono">Dual-Gate Hard Deny Lock</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 4: LEAD-GATED INTERACTIVE PRODUCT SIMULATORS              */}
        {/* ------------------------------------------------------------------ */}
        <section id="simulators" className="scroll-mt-24 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs uppercase tracking-wider font-extrabold text-cyan-400">
              Interactive Product Lab
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              Test Drive KORBIT ABOS Core Engines Live
            </p>
            <p className="text-xs text-slate-400 max-w-xl mx-auto">
              Simulate the Dual-Gate Discount SLA Escalation Desk and test the AI Voice-to-CRM Extractor in real-time.
            </p>
          </div>

          <div className="relative">
            {/* The Simulators Container */}
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 ${!isSimulatorUnlocked ? "filter blur-[2px] pointer-events-none select-none opacity-40" : ""}`}>
              {/* Simulator 1: Dual-Gate Discount Desk */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                      <Percent className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Dual-Gate Discount SLA Simulator</h4>
                      <p className="text-[11px] text-slate-400">Simulate pricing negotiations and automated approval escalation</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                    Live Engine
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-semibold text-slate-300">Catalog List Price:</span>
                    <span className="text-sm font-bold text-slate-200">₹{simListPrice.toLocaleString("en-IN")}</span>
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <label className="text-xs font-bold text-slate-300">Offered Executive Price:</label>
                      <span className="text-lg font-black text-cyan-400">
                        ₹{simOfferedPrice.toLocaleString("en-IN")}{" "}
                        <span className="text-xs font-normal text-slate-400">({simDiscountPercent}% Discount)</span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min={650}
                      max={1000}
                      step={10}
                      value={simOfferedPrice}
                      onChange={(e) => setSimOfferedPrice(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>₹650 (35% Max)</span>
                      <span>₹800 (20%)</span>
                      <span>₹900 (10%)</span>
                      <span>₹1,000 (0%)</span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Autonomous Gate Level:</span>
                      <span className="font-bold text-white">{simApprovalRouting.level}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Allocated SLA Timer:</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border font-mono ${simApprovalRouting.badge}`}>
                        {simApprovalRouting.sla}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <span className="text-cyan-400 font-bold">Autonomous SLA Guarantee:</span> If unreviewed within {simApprovalRouting.sla}, the background escalation daemon auto-promotes this deal to the next senior officer!
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulator 2: AI Voice-to-CRM Extractor */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">AI Voice-to-CRM Extractor</h4>
                      <p className="text-[11px] text-slate-400">Google Gemini voice parsing into structured CRM fields</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    Gemini 2.5
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Select Sample Meeting Dictation:
                    </label>
                    <div className="space-y-2">
                      {sampleTranscripts.map((t, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setSelectedTranscriptIndex(idx);
                            setAiExtractionOutput(null);
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                            selectedTranscriptIndex === idx
                              ? "bg-slate-950 border-cyan-500 text-white"
                              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-300"
                          }`}
                        >
                          &ldquo;{t}&rdquo;
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSimulateAi}
                    disabled={aiSimulationRunning}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                  >
                    <Sparkles className="w-4 h-4" />
                    {aiSimulationRunning ? "Extracting CRM Fields..." : "Run AI Extraction Simulation"}
                  </button>

                  {aiExtractionOutput && (
                    <div className="p-4 bg-slate-950 border border-emerald-900/50 rounded-2xl text-xs space-y-2 font-mono">
                      <div className="flex items-center justify-between text-emerald-400 font-bold">
                        <span>Extracted JSON Payload</span>
                        <span>Confidence: {aiExtractionOutput.aiConfidence}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                        <div><span className="text-slate-500">Client:</span> {aiExtractionOutput.clientName}</div>
                        <div><span className="text-slate-500">Contact:</span> {aiExtractionOutput.contactPerson}</div>
                        <div><span className="text-slate-500">Interest:</span> {aiExtractionOutput.productInterest}</div>
                        <div><span className="text-slate-500">Stage:</span> {aiExtractionOutput.suggestedStage}</div>
                        <div className="col-span-2 text-cyan-300">
                          <span className="text-slate-500">Follow-Up:</span> {aiExtractionOutput.followUpDate}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Frost Gate Overlay when not unlocked */}
            {!isSimulatorUnlocked && (
              <div
                onClick={() => setShowLeadModal(true)}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm rounded-3xl p-6 border border-cyan-500/30 cursor-pointer group hover:bg-slate-950/70 transition"
              >
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-4 shadow-xl shadow-cyan-900/40 group-hover:scale-110 transition-transform">
                  <Lock className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white text-center">
                  Unlock Live Product Simulations
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md text-center mt-1.5 leading-relaxed">
                  Provide your business credentials to interact live with the Dual-Gate Discount SLA Desk and the AI Voice-to-CRM Extractor.
                </p>
                <button
                  type="button"
                  className="mt-5 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-cyan-900/40 flex items-center gap-2 group-hover:brightness-110 transition"
                >
                  <Unlock className="w-4 h-4" />
                  Click to Unlock Full Simulation Access
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 5: INTERACTIVE PRICING CALCULATOR                          */}
        {/* ------------------------------------------------------------------ */}
        <section id="pricing" className="scroll-mt-24 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs uppercase tracking-wider font-extrabold text-cyan-400">
              Transparent, Scalable SaaS Pricing
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              Enterprise Subscription Calculator
            </p>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Select your team size and billing cycle. Tier discounts and tax calculations update automatically in real-time.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl max-w-4xl mx-auto space-y-8">
            {/* Cycle Toggle */}
            <div className="flex justify-center items-center gap-3">
              <span className={`text-xs font-semibold ${billingCycle === BillingCycle.MONTHLY ? "text-white" : "text-slate-400"}`}>
                Monthly Billing
              </span>
              <button
                type="button"
                onClick={() => setBillingCycle(billingCycle === BillingCycle.MONTHLY ? BillingCycle.ANNUAL : BillingCycle.MONTHLY)}
                className="w-14 h-7 bg-slate-800 rounded-full p-1 border border-slate-700 transition relative cursor-pointer"
              >
                <div
                  className={`w-5 h-5 bg-cyan-400 rounded-full transition-transform ${
                    billingCycle === BillingCycle.ANNUAL ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-semibold ${billingCycle === BillingCycle.ANNUAL ? "text-cyan-400" : "text-slate-400"}`}>
                  Annual Billing
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                  Save 10%
                </span>
              </div>
            </div>

            {/* Slider & Input */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">Declared Employee Seats</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={employeeCount}
                    onChange={(e) => setEmployeeCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-sm text-cyan-400 focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-xs text-slate-400">users</span>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={500}
                value={employeeCount}
                onChange={(e) => setEmployeeCount(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>1 user (Basic)</span>
                <span>21 users (Advanced)</span>
                <span>101 users (Premium)</span>
                <span>500+ (Enterprise)</span>
              </div>
            </div>

            {/* Tier Card & Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
              <div className="p-6 bg-slate-950/80 border border-cyan-500/30 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-bold">
                    {pricing.planTier} PLAN
                  </span>
                  <span className="text-xs text-slate-400">{employeeCount} seats</span>
                </div>
                <div>
                  <div className="text-3xl font-black text-white">
                    ₹{pricing.pricePerUserMonthlyInr}
                    <span className="text-xs font-normal text-slate-400"> /user/mo</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Billed {billingCycle === "ANNUAL" ? "annually upfront" : "monthly"}
                  </p>
                </div>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    Unlimited DLD organizational hierarchy
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    Automated Dual-Gate discount escalation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    Mobile Field App with DPDP 2023 GPS Kill-Switch
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    Google Gemini Multilingual Voice Extractor
                  </li>
                </ul>
              </div>

              {/* Price Breakdown */}
              <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Base Subtotal ({billingCycle}):</span>
                    <span>₹{pricing.subtotalInr.toLocaleString("en-IN")}</span>
                  </div>
                  {pricing.discountAmountInr > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Annual 10% Discount:</span>
                      <span>- ₹{pricing.discountAmountInr.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span>GST (18% Statutory):</span>
                    <span>₹{pricing.gstAmountInr.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="border-t border-slate-800 pt-3 flex justify-between items-baseline">
                    <span className="font-bold text-sm text-white">Total Payable:</span>
                    <span className="text-2xl font-black text-emerald-400">
                      ₹{pricing.totalPayableInr.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/register?employees=${employeeCount}&cycle=${billingCycle}&company=${encodeURIComponent(organisationName)}`}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/40 transition cursor-pointer text-center"
                >
                  Start Onboarding for {employeeCount} Users
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 6: LIVE PORTALS QUICK LAUNCH                              */}
        {/* ------------------------------------------------------------------ */}
        <section className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="font-bold text-lg text-white">Experience All 3 Built-In Interfaces</h3>
            <p className="text-xs text-slate-400">Test with live pre-seeded demonstration data out-of-the-box</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/command"
              className="p-5 bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 rounded-2xl transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400">Command Dashboard</span>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition" />
              </div>
              <p className="text-xs text-slate-300">
                Unified view for CEO, Sales Head, HR Head, Commercial Head & City Managers.
              </p>
            </Link>

            <Link
              href="/dashboard/field"
              className="p-5 bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 rounded-2xl transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400">Mobile Field Executive App</span>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition" />
              </div>
              <p className="text-xs text-slate-300">
                Attendance clock-in, 3-point GPS check-in, distance allowance & Voice-to-CRM.
              </p>
            </Link>

            <Link
              href="/super-admin/login"
              className="p-5 bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 rounded-2xl transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400">Layer 00 SaaS Control Plane</span>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition" />
              </div>
              <p className="text-xs text-slate-300">
                SaaS owner portal: cross-tenant MRR/ARR telemetry, tenant toggle & support desk.
              </p>
            </Link>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* LEAD CAPTURE MODAL                                                 */}
      {/* ------------------------------------------------------------------ */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Unlock Live Product Simulators</h3>
                  <p className="text-[11px] text-slate-400">Instant access to Discount SLA Desk & AI Voice-to-CRM</p>
                </div>
              </div>
              <button
                onClick={() => setShowLeadModal(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {leadError && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                {leadError}
              </div>
            )}

            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Business Work Email ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={leadForm.businessEmail}
                  onChange={(e) => setLeadForm({ ...leadForm, businessEmail: e.target.value })}
                  placeholder="name@company.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Organisation Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={leadForm.organisationName}
                  onChange={(e) => setLeadForm({ ...leadForm, organisationName: e.target.value })}
                  placeholder="Apex Industries Pvt Ltd"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={leadForm.city}
                    onChange={(e) => setLeadForm({ ...leadForm, city: e.target.value })}
                    placeholder="e.g. Kochi"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    State <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={leadForm.state}
                    onChange={(e) => setLeadForm({ ...leadForm, state: e.target.value })}
                    placeholder="e.g. Kerala"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Country</label>
                  <input
                    type="text"
                    value={leadForm.country}
                    onChange={(e) => setLeadForm({ ...leadForm, country: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Number of Employees</label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={leadForm.employeeCount}
                    onChange={(e) => setLeadForm({ ...leadForm, employeeCount: Number(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Unlocking will register your enterprise solution profile and sync your team size directly into the pricing calculator.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeadModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={leadLoading}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-900/40 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  {leadLoading ? "Unlocking Access..." : "Unlock Full Simulators"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-10 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-300">KORBIT ABOS V1.0</span>
            <span>•</span>
            <span>Autonomous Business Operating System</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/legal/privacy" className="hover:text-slate-300 transition">
              Privacy Policy (DPDP Act 2023)
            </Link>
            <Link href="/legal/terms" className="hover:text-slate-300 transition">
              Terms of Service
            </Link>
            <Link href="/super-admin/login" className="hover:text-slate-300 transition">
              Platform Owner Portal
            </Link>
          </div>

          <div>
            © 2026 KORBIT ABOS Technologies. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
