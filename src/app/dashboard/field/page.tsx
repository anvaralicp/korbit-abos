"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Smartphone,
  MapPin,
  Clock,
  Mic,
  MicOff,
  CheckCircle,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Plus,
  Percent,
  DollarSign,
  ShieldAlert,
  ArrowRight,
  Car,
  Navigation,
  Sparkles,
  Building2,
  RefreshCw,
  X,
  FileCheck,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function FieldExecutiveDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 3-Point Meeting Cycle State
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [activeVisit, setActiveVisit] = useState<any | null>(null);
  const [cycleStep, setCycleStep] = useState<1 | 2 | 3>(1);
  const [cycleMsg, setCycleMsg] = useState<string | null>(null);

  // AI Voice-to-CRM State
  const [isRecording, setIsRecording] = useState(false);
  const [spokenText, setSpokenText] = useState(
    "Met Rajesh at Fosroc, they want 500 units of Product A at ₹900 unit price, follow up on Friday"
  );
  const [aiExtracting, setAiExtracting] = useState(false);
  const [extractedResult, setExtractedResult] = useState<any | null>(null);

  // Modals
  const [showAddClient, setShowAddClient] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Add Client Form
  const [newClient, setNewClient] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactMobile: "",
    address: "",
    city: "Kochi",
  });

  // Discount Request Form
  const [discountForm, setDiscountForm] = useState({
    dealId: "",
    dealLineItemId: "",
    offeredPriceInr: 900,
  });

  const recognitionRef = useRef<any>(null);

  const fetchExecutiveData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/field/executive-data");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load executive data");
      setData(json);

      if (json.clients && json.clients.length > 0 && !selectedClientId) {
        setSelectedClientId(json.clients[0].id);
      }

      // Check if there is an in-progress visit
      const inProgress = json.visits?.find((v: any) => !v.checkedOutAt);
      if (inProgress) {
        setActiveVisit(inProgress);
        setSelectedClientId(inProgress.clientId);
        setCycleStep(inProgress.checkedInAt ? 3 : 2);
      } else {
        setActiveVisit(null);
        setCycleStep(1);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutiveData();
  }, []);

  // Attendance Toggle (Sign In / Sign Out)
  const handleAttendance = async (action: "SIGN_IN" | "SIGN_OUT") => {
    setLoading(true);
    try {
      // Default to Kochi coordinates
      const lat = 9.9312 + (Math.random() - 0.5) * 0.01;
      const lng = 76.2673 + (Math.random() - 0.5) * 0.01;

      const res = await fetch("/api/field/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": data?.user?.id,
          "x-tenant-id": data?.tenant?.id,
        },
        body: JSON.stringify({ action, lat, lng }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Attendance action failed");
      alert(resJson.message);
      await fetchExecutiveData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 3-Point Meeting Cycle Handlers
  const handleStartJourney = async () => {
    if (!selectedClientId) {
      alert("Please select a target client first.");
      return;
    }
    setLoading(true);
    setCycleMsg(null);
    try {
      const originLat = 9.9312;
      const originLng = 76.2673;

      const res = await fetch("/api/field/visits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": data?.user?.id,
          "x-tenant-id": data?.tenant?.id,
        },
        body: JSON.stringify({
          action: "START_JOURNEY",
          clientId: selectedClientId,
          originLat,
          originLng,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to start journey");

      setActiveVisit(json.visit);
      setCycleStep(2);
      setCycleMsg("Journey started from origin. Heading to client premises.");
      await fetchExecutiveData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!activeVisit) return;
    setLoading(true);
    setCycleMsg(null);
    try {
      // Coordinates matching client location (within 100m)
      const checkInLat = 9.9482;
      const checkInLng = 76.2754;

      const res = await fetch("/api/field/visits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": data?.user?.id,
          "x-tenant-id": data?.tenant?.id,
        },
        body: JSON.stringify({
          action: "CHECK_IN",
          visitId: activeVisit.id,
          checkInLat,
          checkInLng,
          liveVerificationPhotoUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Check-in failed");

      setActiveVisit(json.visit);
      setCycleStep(3);
      setCycleMsg(`Check-in verified (${json.distanceFromClientMeters}m from client). Meeting started.`);
      await fetchExecutiveData();
    } catch (err: any) {
      alert(`Check-in Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeVisit) return;
    setLoading(true);
    setCycleMsg(null);
    try {
      const checkOutLat = 9.9485;
      const checkOutLng = 76.2758;

      const res = await fetch("/api/field/visits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": data?.user?.id,
          "x-tenant-id": data?.tenant?.id,
        },
        body: JSON.stringify({
          action: "CHECK_OUT",
          visitId: activeVisit.id,
          checkOutLat,
          checkOutLng,
          meetingRemarks: "Meeting concluded successfully. Client discussed pricing.",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Check-out failed");

      setCycleStep(1);
      setActiveVisit(null);
      setCycleMsg(
        `Meeting completed! Road Distance: ${json.roadDistanceKm} km. Travel allowance and HR payroll report updated automatically.`
      );
      await fetchExecutiveData();
    } catch (err: any) {
      alert(`Check-out Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // AI Voice-to-CRM Processor
  const handleProcessVoiceToCrm = async () => {
    if (!selectedClientId) {
      alert("Please select a target client first.");
      return;
    }
    setAiExtracting(true);
    setExtractedResult(null);

    try {
      const visitId = activeVisit?.id || data?.visits?.[0]?.id || "standalone";

      const res = await fetch("/api/ai/voice-to-crm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": data?.user?.id,
          "x-tenant-id": data?.tenant?.id,
        },
        body: JSON.stringify({
          visitId,
          clientId: selectedClientId,
          spokenText,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI Extraction failed");

      setExtractedResult(json.aiExtracted);
      await fetchExecutiveData();
    } catch (err: any) {
      alert(`AI Error: ${err.message}`);
    } finally {
      setAiExtracting(false);
    }
  };

  // Browser Speech Recognition
  const toggleSpeechRecognition = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Browser Speech Recognition not supported. You can type or edit the transcript text directly.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN";

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) setSpokenText(transcript);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn(e);
      setIsRecording(false);
    }
  };

  // Add Client Submission
  const handleAddClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": data?.user?.id,
          "x-tenant-id": data?.tenant?.id,
        },
        body: JSON.stringify({
          ...newClient,
          zoneId: data?.user?.zoneId,
          stateRegionId: data?.user?.stateRegionId,
          divisionId: data?.user?.divisionId,
          contactDesignation: "Manager",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add client");
      alert(`Client ${json.client.companyName} (${json.client.clientCode}) created!`);
      setShowAddClient(false);
      await fetchExecutiveData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Toggle Resignation Freeze
  const handleToggleFreeze = async () => {
    try {
      const res = await fetch("/api/field/executive-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleFreeze: !data?.user?.isResignationFrozen }),
      });
      const json = await res.json();
      alert(json.message);
      await fetchExecutiveData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const isLiveGps = data?.attendance?.isGpsTrackingLive;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Platform Brand Sub-bar */}
      <div className="bg-slate-950/90 border-b border-slate-900 px-4 py-1.5 flex items-center justify-between text-xs">
        <Link href="/">
          <BrandLogo variant="dark" size="sm" showBadge={false} />
        </Link>
        <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Field Mobile Terminal</span>
      </div>

      {/* Mobile-First Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-xs">
            RS
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-extrabold text-white">Rahul Sharma</h1>
              <span className="text-[10px] px-1.5 py-0.2 bg-blue-950 border border-blue-800 text-blue-300 font-mono rounded">
                EMP0234
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Layer 06 Field Executive • Kochi Division</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/command"
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
          >
            Command View
          </Link>
          <button
            onClick={() => fetchExecutiveData()}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-5">
        {/* Work-Hours Attendance & DPDP Kill-Switch Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Work-Hours Duty & GPS State
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${isLiveGps ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`}
              />
              <span
                className={`text-[11px] font-bold ${
                  isLiveGps ? "text-emerald-400" : "text-slate-400"
                }`}
              >
                {isLiveGps ? "GPS TRACKING: ACTIVE" : "GPS: OFF (DPDP PRIVACY)"}
              </span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
            <div className="text-xs">
              <div className="text-slate-400">
                Shift Status:{" "}
                <span className="font-bold text-white">
                  {data?.attendance?.signedInAt
                    ? data?.attendance?.signedOutAt
                      ? "Duty Completed"
                      : "On Duty (In Progress)"
                    : "Not Signed In"}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {isLiveGps
                  ? "Route verification active for travel allowance claims"
                  : "0 tracking off-duty per DPDP Act 2023"}
              </div>
            </div>

            <div className="flex gap-2">
              {!data?.attendance?.signedInAt && (
                <button
                  onClick={() => handleAttendance("SIGN_IN")}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow"
                >
                  Sign In
                </button>
              )}
              {data?.attendance?.signedInAt && !data?.attendance?.signedOutAt && (
                <button
                  onClick={() => handleAttendance("SIGN_OUT")}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow"
                >
                  Sign Out (Kill GPS)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3-Step Field Meeting Check-In/Out Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                3-Step Field Meeting Verification
              </h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-blue-950 border border-blue-800 text-blue-300 rounded font-semibold">
              Step {cycleStep} of 3
            </span>
          </div>

          {/* Client Selector */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Target Account:</label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              disabled={cycleStep > 1}
              className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              {data?.clients?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.clientCode}) • {c.currentStage}
                </option>
              ))}
            </select>
          </div>

          {/* Step Progress Tracker */}
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
            <div
              className={`p-2 rounded-lg border ${
                cycleStep === 1
                  ? "bg-blue-950 border-blue-600 text-blue-300"
                  : cycleStep > 1
                  ? "bg-emerald-950 border-emerald-800 text-emerald-400"
                  : "bg-slate-950 border-slate-800 text-slate-500"
              }`}
            >
              1. Start Journey
            </div>
            <div
              className={`p-2 rounded-lg border ${
                cycleStep === 2
                  ? "bg-blue-950 border-blue-600 text-blue-300"
                  : cycleStep > 2
                  ? "bg-emerald-950 border-emerald-800 text-emerald-400"
                  : "bg-slate-950 border-slate-800 text-slate-500"
              }`}
            >
              2. Verify GPS &le;100m
            </div>
            <div
              className={`p-2 rounded-lg border ${
                cycleStep === 3
                  ? "bg-blue-950 border-blue-600 text-blue-300"
                  : "bg-slate-950 border-slate-800 text-slate-500"
              }`}
            >
              3. Check Out & Road Km
            </div>
          </div>

          {cycleMsg && (
            <div className="p-2.5 rounded-lg bg-blue-950/60 border border-blue-800 text-blue-200 text-xs">
              {cycleMsg}
            </div>
          )}

          {/* Step Action Buttons */}
          <div className="pt-1">
            {cycleStep === 1 && (
              <button
                onClick={handleStartJourney}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <Navigation className="w-3.5 h-3.5" /> Start Journey to Client
              </button>
            )}

            {cycleStep === 2 && (
              <button
                onClick={handleCheckIn}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Check-In at Client Premises (&le;100m)
              </button>
            )}

            {cycleStep === 3 && (
              <button
                onClick={handleCheckOut}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <Car className="w-3.5 h-3.5" /> Check Out & Compute Road Km Allowance
              </button>
            )}
          </div>
        </div>

        {/* Day-1 AI Differentiator: AI Voice-to-CRM Extractor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                AI Voice-to-CRM Structured Extractor (Gemini 2.5)
              </h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-purple-950 border border-purple-800 text-purple-300 rounded font-semibold">
              Commercial Differentiator
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            Record or speak your post-meeting debrief. AI automatically extracts the expected price, quantities, lead heat level, and follow-up date directly into the CRM.
          </p>

          <div className="space-y-2">
            <div className="relative">
              <textarea
                rows={3}
                value={spokenText}
                onChange={(e) => setSpokenText(e.target.value)}
                placeholder="Speak or type field meeting notes..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`absolute bottom-3 right-3 p-2 rounded-xl transition ${
                  isRecording ? "bg-red-600 text-white animate-pulse" : "bg-slate-800 text-slate-300 hover:text-white"
                }`}
                title={isRecording ? "Listening..." : "Click to speak"}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={handleProcessVoiceToCrm}
              disabled={aiExtracting}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {aiExtracting ? "Extracting CRM Entities via AI..." : "Extract & Commit to CRM"}
            </button>
          </div>

          {/* AI Structured Extraction Result Display */}
          {extractedResult && (
            <div className="bg-slate-950 border border-blue-900/50 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                <span className="font-bold text-blue-400 text-[11px]">Structured CRM Entities Extracted:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    extractedResult.natureOfCall === "HOT"
                      ? "bg-rose-950 text-rose-300 border border-rose-800"
                      : "bg-amber-950 text-amber-300 border border-amber-800"
                  }`}
                >
                  {extractedResult.natureOfCall}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-900/80 p-2 rounded">
                  <span className="text-slate-500">Expected Rate:</span>
                  <div className="font-bold text-white">
                    {extractedResult.expectedPriceInr
                      ? `₹${extractedResult.expectedPriceInr.toLocaleString("en-IN")}`
                      : "None mentioned"}
                  </div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded">
                  <span className="text-slate-500">Quantity Demanded:</span>
                  <div className="font-bold text-white">
                    {extractedResult.quantityRequired ? `${extractedResult.quantityRequired} units` : "None"}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/80 p-2 rounded text-[11px]">
                <span className="text-slate-500">Executive Summary:</span>
                <p className="text-slate-200 mt-0.5">{extractedResult.summaryRemarks}</p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Operational Modals Trigger Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setShowAddClient(true)}
            className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-center text-xs font-bold text-slate-200 flex flex-col items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            Add Client
          </button>

          <Link
            href="/dashboard/command"
            className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-center text-xs font-bold text-slate-200 flex flex-col items-center justify-center gap-1"
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Pipeline Status
          </Link>

          <button
            onClick={() => alert("Leave request draft submitted to Senior Approver.")}
            className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-center text-xs font-bold text-slate-200 flex flex-col items-center justify-center gap-1"
          >
            <Clock className="w-4 h-4 text-purple-400" />
            Apply Leave
          </button>

          <button
            onClick={handleToggleFreeze}
            className={`p-3 border rounded-xl text-center text-xs font-bold flex flex-col items-center justify-center gap-1 ${
              data?.user?.isResignationFrozen
                ? "bg-red-950 border-red-700 text-red-300"
                : "bg-slate-900 border-slate-800 text-slate-300"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            {data?.user?.isResignationFrozen ? "Freeze: ON" : "Test Freeze"}
          </button>
        </div>

        {/* Monthly Payroll & Travel Summary Card */}
        {data?.hrReport && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Car className="w-4 h-4 text-blue-400" /> Current Month Travel Allowance (₹10/km)
              </span>
              <span className="font-black text-emerald-400">
                ₹{Number(data.hrReport.travelAllowanceInr).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{data.hrReport.totalFieldVisits} Verified Meetings</span>
              <span>{Number(data.hrReport.totalTravelDistanceKm).toFixed(1)} km Road Distance</span>
              <span>Net Pay: ₹{Number(data.hrReport.netPayableInr).toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" /> Add Client Account (Locked)
              </h3>
              <button onClick={() => setShowAddClient(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddClientSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Skyline Logistics Ltd"
                  value={newClient.companyName}
                  onChange={(e) => setNewClient((p) => ({ ...p, companyName: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Primary Contact Person</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Harish Kumar"
                  value={newClient.contactName}
                  onChange={(e) => setNewClient((p) => ({ ...p, contactName: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="contact@company.com"
                    value={newClient.contactEmail}
                    onChange={(e) => setNewClient((p) => ({ ...p, contactEmail: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Mobile</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={newClient.contactMobile}
                    onChange={(e) => setNewClient((p) => ({ ...p, contactMobile: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Address / Street</label>
                <input
                  type="text"
                  required
                  placeholder="Marine Drive, Kochi"
                  value={newClient.address}
                  onChange={(e) => setNewClient((p) => ({ ...p, address: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
