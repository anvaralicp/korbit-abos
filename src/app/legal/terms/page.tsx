import React from "react";
import Link from "next/link";
import { FileText, ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Terms of Service | KORBIT ABOS",
  description: "Standard terms and conditions governing the subscription and usage of KORBIT Autonomous Business Operating System.",
};

export default function TermsOfServicePage() {
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
            <FileText className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">KORBIT Legal & Compliance Desk</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="space-y-2 border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-400 text-xs font-semibold">
            Commercial Software-as-a-Service Master Agreement
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Terms of Service</h1>
          <p className="text-xs text-slate-400">
            Last Updated: March 1, 2026 • Governed by the Laws of the Republic of India
          </p>
        </div>

        <section className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">1. Acceptance of Terms</h2>
          <p>
            By accessing, registering an organization account, or deploying KORBIT Autonomous Business Operating System (&ldquo;KORBIT ABOS&rdquo;), you (&ldquo;Subscriber&rdquo; or &ldquo;Customer&rdquo;) agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a company or legal entity, you represent that you possess the authority to bind such entity.
          </p>
        </section>

        <section className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">2. Subscription Tiers & Billing Rules</h2>
          <p>
            KORBIT ABOS is licensed on a per-user seat basis across tiered employee brackets:
          </p>
          <ul className="space-y-1 pl-4 list-disc text-slate-400">
            <li><strong>BASIC Plan (1–20 Users):</strong> ₹299 / user / month</li>
            <li><strong>ADVANCED Plan (21–100 Users):</strong> ₹599 / user / month</li>
            <li><strong>PREMIUM Plan (101–500 Users):</strong> ₹999 / user / month</li>
            <li><strong>ENTERPRISE Plan (500+ Users):</strong> Custom bespoke agreement</li>
          </ul>
          <p className="pt-2">
            <strong>Annual Billing Discount:</strong> Subscribers selecting an annual commitment receive an upfront 10% discount on the gross software license fee.
          </p>
          <p>
            <strong>Taxes & Invoicing:</strong> All subscription charges are subject to statutory Goods and Services Tax (GST) at 18% (9% CGST + 9% SGST for intrastate or 18% IGST for interstate transactions). Official GST B2B tax invoices are automatically issued upon transaction clearance.
          </p>
        </section>

        <section className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">3. Multi-Tenant Service Availability & SLA</h2>
          <p>
            KORBIT guarantees a 99.5% service uptime commitment for its cloud platform, excluding scheduled maintenance windows notified in advance. Multi-tenant database security ensures complete data segregation between disparate tenant organizations.
          </p>
        </section>

        <section className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">4. Customer Data Ownership & Confidentiality</h2>
          <p>
            The Subscriber retains all right, title, and interest in and to all customer records, sales leads, financial proposals, and employee records uploaded into KORBIT ABOS. KORBIT shall not disclose, sell, or monetize Subscriber data, nor utilize customer CRM records to train public artificial intelligence models.
          </p>
        </section>

        <section className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">5. Limitation of Liability & Governing Law</h2>
          <p>
            In no event shall KORBIT ABOS Technologies or its affiliates be liable for any indirect, incidental, special, or consequential damages. This agreement is governed by the laws of India, with exclusive jurisdiction conferred upon the commercial courts of Ernakulam / Kochi, Kerala.
          </p>
        </section>

        <section className="space-y-2 text-xs text-slate-400 pt-4 border-t border-slate-800">
          <p>Questions regarding these terms? Contact our commercial contracts desk at <code>legal@korbit.in</code>.</p>
        </section>
      </main>
    </div>
  );
}
