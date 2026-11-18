"use client";

import React, { useState, useEffect } from "react";
import {
  HelpCircle,
  X,
  MessageSquare,
  PlusCircle,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface Message {
  id: string;
  senderRole: string;
  senderName: string;
  message: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: "BILLING" | "BUG_REPORT" | "SETUP_HELP" | "FEATURE_REQUEST";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "WAITING_ON_TENANT" | "RESOLVED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  createdBy: {
    fullName: string;
    email: string;
  };
  messages: Message[];
}

interface SupportWidgetProps {
  tenantId: string;
  userId: string;
}

export default function SupportWidget({ tenantId, userId }: SupportWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"LIST" | "CREATE" | "DETAIL">("LIST");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // New ticket state
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<"BILLING" | "BUG_REPORT" | "SETUP_HELP" | "FEATURE_REQUEST">("SETUP_HELP");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [initialMessage, setInitialMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const fetchTickets = async () => {
    if (!tenantId || !userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/support/tickets?userId=${userId}&tenantId=${tenantId}`);
      const data = await res.json();
      if (data.success && data.tickets) {
        setTickets(data.tickets);
        if (selectedTicket) {
          const fresh = data.tickets.find((t: Ticket) => t.id === selectedTicket.id);
          if (fresh) setSelectedTicket(fresh);
        }
      }
    } catch (e) {
      console.error("Failed to fetch tickets", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTickets();
    }
  }, [isOpen]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !initialMessage.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/support/tickets?userId=${userId}&tenantId=${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          category,
          priority,
          message: initialMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubject("");
        setInitialMessage("");
        await fetchTickets();
        setActiveTab("LIST");
      } else {
        alert(data.error || "Failed to create ticket");
      }
    } catch {
      alert("Error submitting support request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/reply?userId=${userId}&tenantId=${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyText("");
        setSelectedTicket(data.ticket);
        fetchTickets();
      } else {
        alert(data.error || "Failed to send message");
      }
    } catch {
      alert("Error sending message.");
    } finally {
      setReplying(false);
    }
  };

  const getStatusBadge = (status: Ticket["status"]) => {
    switch (status) {
      case "OPEN":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">Open</span>;
      case "IN_PROGRESS":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">In Progress</span>;
      case "WAITING_ON_TENANT":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">Awaiting Reply</span>;
      case "RESOLVED":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Resolved</span>;
      case "CLOSED":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-500/20 text-slate-400 border border-slate-500/30">Closed</span>;
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium px-4 py-3 rounded-full shadow-lg shadow-cyan-900/40 hover:scale-105 transition-all duration-200 border border-cyan-400/30"
        title="24/7 Platform Support Desk"
      >
        <HelpCircle className="w-5 h-5" />
        <span className="text-sm tracking-wide">Support Desk</span>
      </button>

      {/* Slide-over Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-2 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[650px] overflow-hidden text-slate-100 animate-in fade-in slide-in-from-bottom-6 duration-200">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-100">KORBIT Support Desk</h3>
                  <p className="text-xs text-slate-400">Direct Layer 00 Platform Engineering Help</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchTickets}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            {activeTab !== "DETAIL" && (
              <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-2 text-xs font-medium">
                <button
                  onClick={() => setActiveTab("LIST")}
                  className={`pb-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                    activeTab === "LIST"
                      ? "border-cyan-500 text-cyan-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Your Tickets ({tickets.length})
                </button>
                <button
                  onClick={() => setActiveTab("CREATE")}
                  className={`pb-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                    activeTab === "CREATE"
                      ? "border-cyan-500 text-cyan-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Raise New Ticket
                </button>
              </div>
            )}

            {/* Tab: Tickets List */}
            {activeTab === "LIST" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading && tickets.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                    Loading tickets...
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <CheckCircle2 className="w-10 h-10 mb-2 text-slate-600" />
                    <p className="font-medium text-slate-300">No support tickets found</p>
                    <p className="text-xs mt-1 text-slate-500">Have an issue or billing query? Raise a ticket and our platform engineering team will assist.</p>
                    <button
                      onClick={() => setActiveTab("CREATE")}
                      className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
                    >
                      Raise a Ticket
                    </button>
                  </div>
                ) : (
                  tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTicket(t);
                        setActiveTab("DETAIL");
                      }}
                      className="p-3.5 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-850 hover:border-slate-700 rounded-xl cursor-pointer transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-cyan-400 font-bold">{t.ticketNumber}</span>
                        {getStatusBadge(t.status)}
                      </div>
                      <h4 className="text-sm font-semibold text-slate-200 line-clamp-1">{t.subject}</h4>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span className="capitalize">{t.category.toLowerCase().replace("_", " ")}</span>
                        <span>{t.messages.length} messages</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Create Ticket */}
            {activeTab === "CREATE" && (
              <form onSubmit={handleCreateTicket} className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. GST invoice copy needed / Onboarding sync issue"
                    className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="SETUP_HELP">Setup / DLD Hierarchy</option>
                      <option value="BILLING">Billing & Subscription</option>
                      <option value="BUG_REPORT">Bug Report</option>
                      <option value="FEATURE_REQUEST">Feature Request</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent (System Block)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={initialMessage}
                    onChange={(e) => setInitialMessage(e.target.value)}
                    placeholder="Describe your issue or request in detail..."
                    className="w-full bg-slate-950 border border-slate-750 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("LIST")}
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Ticket"}
                  </button>
                </div>
              </form>
            )}

            {/* Tab: Detail & Conversation Thread */}
            {activeTab === "DETAIL" && selectedTicket && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Thread Header */}
                <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => setActiveTab("LIST")}
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    ← Back to tickets
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-300">{selectedTicket.ticketNumber}</span>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                </div>

                <div className="px-4 py-2 bg-slate-900 border-b border-slate-850">
                  <h4 className="text-sm font-semibold text-slate-100">{selectedTicket.subject}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>{selectedTicket.category.replace("_", " ")}</span>
                    <span>•</span>
                    <span>Priority: {selectedTicket.priority}</span>
                  </div>
                </div>

                {/* Messages scroll area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/30">
                  {selectedTicket.messages.map((m) => {
                    const isSuperAdmin = m.senderRole === "SUPER_ADMIN";
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isSuperAdmin ? "items-start" : "items-end"}`}
                      >
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1">
                          <span className={`font-semibold ${isSuperAdmin ? "text-cyan-400" : "text-slate-300"}`}>
                            {m.senderName} {isSuperAdmin ? "(Platform Support)" : ""}
                          </span>
                          <span>•</span>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                            isSuperAdmin
                              ? "bg-slate-800 border border-cyan-500/30 text-slate-200 rounded-tl-sm"
                              : "bg-cyan-600 text-white rounded-tr-sm"
                          }`}
                        >
                          {m.message}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply bar */}
                <form onSubmit={handleSendReply} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a message to support..."
                    className="flex-1 bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={replying || !replyText.trim()}
                    className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
