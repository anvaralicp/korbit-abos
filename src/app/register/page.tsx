"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  AlertCircle,
  Loader2,
  Receipt,
  Check,
} from "lucide-react";
import { calculatePricing } from "@/lib/pricing";
import { BillingCycle } from "@prisma/client";
import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RegisterFormData {
  companyName: string;
  adminFullName: string;
  adminEmail: string;
  adminDesignation: string;
  adminContactNumber: string;
  declaredEmployeeCount: number;
  countryRegion: string;
  operatingState: string;
  industryType: string;
  billingCycle: BillingCycle;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<RegisterFormData>({
    companyName: "",
    adminFullName: "",
    adminEmail: "",
    adminDesignation: "Managing Director",
    adminContactNumber: "",
    declaredEmployeeCount: 15,
    countryRegion: "India",
    operatingState: "Kerala",
    industryType: "Technology & Software",
    billingCycle: BillingCycle.MONTHLY,
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDevModal, setShowDevModal] = useState<{
    orderId: string;
    tenantId: string;
    amount: number;
  } | null>(null);

  // Pre-fill from query parameters if coming from pricing calculator
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emp = params.get("employees");
      const cycle = params.get("cycle");
      if (emp || cycle) {
        setFormData((prev) => ({
          ...prev,
          ...(emp && !isNaN(Number(emp)) && Number(emp) > 0 ? { declaredEmployeeCount: Number(emp) } : {}),
          ...(cycle === "ANNUAL" ? { billingCycle: BillingCycle.ANNUAL } : cycle === "MONTHLY" ? { billingCycle: BillingCycle.MONTHLY } : {}),
        }));
      }
    }
  }, []);

  // Real-time dynamic pricing calculation
  const pricing = useMemo(() => {
    return calculatePricing(formData.declaredEmployeeCount, formData.billingCycle);
  }, [formData.declaredEmployeeCount, formData.billingCycle]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "declaredEmployeeCount" ? Number(value) : value,
    }));
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleDevPaymentSimulation = async () => {
    if (!showDevModal) return;
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: showDevModal.tenantId,
          razorpayOrderId: showDevModal.orderId,
          razorpayPaymentId: `pay_sim_${Date.now()}`,
          isDevSimulation: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment verification failed");

      router.push(`/setup-org?tenantId=${showDevModal.tenantId}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Payment simulation failed");
    } finally {
      setLoading(false);
      setShowDevModal(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Register Tenant & Create Order
      const res = await fetch("/api/onboarding/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed. Please check inputs.");
      }

      const { tenantId, orderId, razorpayKeyId } = data;

      // Check if Razorpay keys are placeholders -> show seamless dev simulation modal
      const isPlaceholder =
        !razorpayKeyId ||
        razorpayKeyId.includes("placeholder") ||
        razorpayKeyId === "rzp_test_placeholder";

      if (isPlaceholder) {
        setShowDevModal({
          orderId,
          tenantId,
          amount: pricing.totalPayableInr,
        });
        setLoading(false);
        return;
      }

      // Step 2: Live Razorpay Gateway Checkout
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        // Fallback to dev modal if CDN is unreachable
        setShowDevModal({
          orderId,
          tenantId,
          amount: pricing.totalPayableInr,
        });
        setLoading(false);
        return;
      }

      const options = {
        key: razorpayKeyId,
        amount: pricing.totalPayablePaise,
        currency: "INR",
        name: "KORBIT ABOS Commercial MVP",
        description: `Subscription: ${pricing.planTier} Plan (${formData.declaredEmployeeCount} Users)`,
        order_id: orderId,
        handler: async (response: any) => {
          setLoading(true);
          try {
            const verifyRes = await fetch("/api/onboarding/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tenantId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed");

            router.push(`/setup-org?tenantId=${tenantId}`);
          } catch (vErr: any) {
            setErrorMsg(vErr.message);
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: formData.adminFullName,
          email: formData.adminEmail,
          contact: formData.adminContactNumber,
        },
        theme: {
          color: "#0f172a",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 flex flex-col items-center">
          <Link href="/" className="mb-4 inline-block">
            <BrandLogo variant="dark" size="lg" />
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800 text-blue-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Commercial SaaS Onboarding • Module 1
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Register Your Enterprise Workspace
          </h1>
          <p className="mt-2 text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Autonomous Business Operating System — Tiered Enterprise Subscription, Dynamic Layer Detection & 5-Zone Setup.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800 flex items-start gap-3 text-red-200">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-400" />
            <div>
              <p className="font-semibold text-sm">Registration Error</p>
              <p className="text-xs text-red-300 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Form (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Details */}
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  Enterprise Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Company Name</label>
                    <input
                      type="text"
                      name="companyName"
                      required
                      placeholder="e.g. Acme Technologies Ltd"
                      value={formData.companyName}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Industry Sector</label>
                    <select
                      name="industryType"
                      value={formData.industryType}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option>Technology & Software</option>
                      <option>Manufacturing & Industrial</option>
                      <option>Healthcare & Pharma</option>
                      <option>FMCG & Consumer Goods</option>
                      <option>Financial Services</option>
                      <option>Retail & Distribution</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Operating State (GST Hub)</label>
                    <select
                      name="operatingState"
                      value={formData.operatingState}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option>Kerala</option>
                      <option>Tamil Nadu</option>
                      <option>Karnataka</option>
                      <option>Maharashtra</option>
                      <option>Delhi NCR</option>
                      <option>Gujarat</option>
                      <option>West Bengal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Country / Region</label>
                    <input
                      type="text"
                      name="countryRegion"
                      disabled
                      value={formData.countryRegion}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Administrator Profile */}
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                  <Lock className="w-5 h-5 text-blue-400" />
                  Primary Layer 01 Administrator
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Admin Full Name</label>
                    <input
                      type="text"
                      name="adminFullName"
                      required
                      placeholder="e.g. Rajesh Menon"
                      value={formData.adminFullName}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Admin Designation</label>
                    <input
                      type="text"
                      name="adminDesignation"
                      required
                      placeholder="e.g. Managing Director"
                      value={formData.adminDesignation}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Admin Corporate Email</label>
                    <input
                      type="email"
                      name="adminEmail"
                      required
                      placeholder="admin@company.com"
                      value={formData.adminEmail}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      name="adminContactNumber"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.adminContactNumber}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                    <input
                      type="password"
                      name="password"
                      required
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      required
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Employee Count & Billing Cycle */}
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Team Size & Billing Term
                </h2>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center text-xs text-slate-300 mb-1">
                      <span>Declared Employee Headcount:</span>
                      <span className="font-bold text-blue-400 text-sm">
                        {formData.declaredEmployeeCount} Users
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="600"
                      step="1"
                      name="declaredEmployeeCount"
                      value={formData.declaredEmployeeCount}
                      onChange={handleChange}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                      <span>1 (Basic)</span>
                      <span>20</span>
                      <span>100 (Advanced)</span>
                      <span>500 (Premium)</span>
                      <span>600+ (Enterprise)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">Billing Term</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((p) => ({ ...p, billingCycle: BillingCycle.MONTHLY }))
                        }
                        className={`py-3 px-4 rounded-xl border text-left transition-all ${
                          formData.billingCycle === BillingCycle.MONTHLY
                            ? "bg-blue-950/60 border-blue-500 text-white shadow-sm"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="font-semibold text-sm">Monthly Billing</div>
                        <div className="text-xs text-slate-400 mt-0.5">Pay standard monthly rates</div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setFormData((p) => ({ ...p, billingCycle: BillingCycle.ANNUAL }))
                        }
                        className={`py-3 px-4 rounded-xl border text-left transition-all relative ${
                          formData.billingCycle === BillingCycle.ANNUAL
                            ? "bg-blue-950/60 border-blue-500 text-white shadow-sm"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-bold rounded-md uppercase">
                          Save 10%
                        </div>
                        <div className="font-semibold text-sm">Annual Billing</div>
                        <div className="text-xs text-emerald-400 mt-0.5">10% instant discount</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/30 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Initializing Enterprise & Order...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Proceed to Payment (₹{pricing.totalPayableInr.toLocaleString("en-IN")})
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Price Summary (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    Computed Tier
                  </span>
                  <div className="text-xl font-extrabold text-blue-400 flex items-center gap-2 mt-0.5">
                    {pricing.planTier} TIER
                  </div>
                </div>
                <div className="px-3 py-1 bg-blue-950 border border-blue-800 rounded-lg text-xs font-bold text-blue-300">
                  ₹{pricing.pricePerUserMonthlyInr}/user/mo
                </div>
              </div>

              <div className="py-4 space-y-3 text-sm border-b border-slate-800">
                <div className="flex justify-between text-slate-300">
                  <span>Users:</span>
                  <span className="font-medium text-white">{pricing.declaredEmployeeCount} Employees</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Term:</span>
                  <span className="font-medium text-white">
                    {pricing.billingCycle === BillingCycle.ANNUAL ? "12 Months (Annual)" : "1 Month"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Gross Subtotal:</span>
                  <span className="font-medium text-white">₹{pricing.subtotalInr.toLocaleString("en-IN")}</span>
                </div>

                {pricing.discountAmountInr > 0 && (
                  <div className="flex justify-between text-emerald-400 font-medium">
                    <span>Annual Savings (10%):</span>
                    <span>-₹{pricing.discountAmountInr.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-300">
                  <span>Net Base:</span>
                  <span className="font-medium text-white">₹{pricing.netSubtotalInr.toLocaleString("en-IN")}</span>
                </div>

                <div className="flex justify-between text-slate-400 text-xs">
                  <span>GST (18% Indian Tax):</span>
                  <span>+₹{pricing.gstAmountInr.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Total Payable */}
              <div className="pt-4">
                <div className="flex justify-between items-baseline mb-4">
                  <span className="text-sm font-semibold text-slate-300">Total Amount Payable:</span>
                  <div className="text-2xl font-black text-white">
                    ₹{pricing.totalPayableInr.toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <Receipt className="w-3.5 h-3.5 text-blue-400" />
                    Included in V1.0 Commercial MVP:
                  </div>
                  <ul className="space-y-1 pl-5 list-disc text-slate-400 text-[11px]">
                    <li>Full 6-Stage Commercial Sales Pipeline & Proposal Engine</li>
                    <li>Dual-Gate 4h-48h Automated Discount Escalations</li>
                    <li>Dynamic Layer Detection (DLD) Hierarchy Engine</li>
                    <li>3-Point GPS Field Attendance & KM Allowance Tracking</li>
                    <li>AI Voice-to-CRM Structured Extraction (Gemini 2.5)</li>
                    <li>Immutable Cryptographic Audit Ledger</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dev Mode Simulation Modal */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-950 border border-blue-800 rounded-xl text-blue-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Development Sandbox Payment</h3>
                <p className="text-xs text-slate-400">Razorpay Test Gateway Mode</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              `RAZORPAY_KEY_ID` is running in test sandbox mode. You can simulate instant payment success to activate the subscription and proceed directly to Phase 2 organizational setup.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 space-y-1 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID:</span>
                <span className="font-mono text-[11px] text-blue-400">{showDevModal.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-white">₹{showDevModal.amount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDevModal(null)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDevPaymentSimulation}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Simulate Success
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
