import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { logImmutableAudit } from "@/lib/audit";
import { CallNature, Prisma } from "@prisma/client";

const VoiceToCrmSchema = z.object({
  visitId: z.string().min(1, "Visit ID is required"),
  clientId: z.string().min(1, "Client ID is required"),
  spokenText: z.string().min(3, "Spoken transcript or remarks text is required"),
  voiceNoteAudioUrl: z.string().optional(),
});

export interface AiExtractedCrmData {
  summaryRemarks: string;
  expectedPriceInr: number | null;
  quantityRequired: number | null;
  nextFollowUpDateIso: string | null;
  natureOfCall: "COLD" | "WARM" | "HOT";
}

/**
 * Fallback parser when Gemini API key is missing or network/rate limits occur.
 */
function heuristicFallbackExtraction(spokenText: string): AiExtractedCrmData {
  const lower = spokenText.toLowerCase();

  let natureOfCall: "COLD" | "WARM" | "HOT" = "WARM";
  if (lower.includes("urgent") || lower.includes("ready to close") || lower.includes("sign today") || lower.includes("hot") || lower.includes("buy")) {
    natureOfCall = "HOT";
  } else if (lower.includes("not interested") || lower.includes("busy") || lower.includes("cold") || lower.includes("later")) {
    natureOfCall = "COLD";
  }

  // Look for currency amounts e.g., "50000" or "50,000" or "rs 25000"
  let expectedPriceInr: number | null = null;
  const priceMatch = spokenText.match(/(?:rs\.?|inr|₹|\bprice\b|\brate\b)\s*[:=]?\s*([0-9,]+)/i);
  if (priceMatch && priceMatch[1]) {
    const parsed = parseInt(priceMatch[1].replace(/,/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0) expectedPriceInr = parsed;
  }

  // Look for quantity e.g., "50 units" or "10 licenses"
  let quantityRequired: number | null = null;
  const qtyMatch = spokenText.match(/(\d+)\s*(?:units?|licenses?|users?|pcs|nos?|packages?)/i);
  if (qtyMatch && qtyMatch[1]) {
    const parsed = parseInt(qtyMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0) quantityRequired = parsed;
  }

  return {
    summaryRemarks: spokenText.trim(),
    expectedPriceInr,
    quantityRequired,
    nextFollowUpDateIso: null,
    natureOfCall,
  };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const validated = VoiceToCrmSchema.parse(body);

    const visit = await prisma.fieldMeetingVisit.findUnique({
      where: { id: validated.visitId },
      include: { client: true },
    });

    if (!visit || visit.userId !== auth.userId) {
      return NextResponse.json({ error: "Field meeting visit not found or unauthorized." }, { status: 404 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isPlaceholderKey = !apiKey || apiKey.includes("placeholder") || apiKey === "your_gemini_api_key_placeholder";

    let extracted: AiExtractedCrmData;
    let isFallback = false;

    if (!isPlaceholderKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are the executive Voice-to-CRM AI agent for KORBIT ABOS.
Extract structured field meeting intelligence from the salesperson's raw audio transcript below into strict JSON format.

JSON Schema required:
{
  "summaryRemarks": "Professional, concise executive synthesis of what was discussed, objections, and agreements",
  "expectedPriceInr": number | null (numeric integer or float in INR, without commas, null if not mentioned),
  "quantityRequired": number | null (numeric quantity of units/licenses, null if not mentioned),
  "nextFollowUpDateIso": "YYYY-MM-DD" | null (ISO date string if a follow-up or next meeting was scheduled, else null),
  "natureOfCall": "COLD" | "WARM" | "HOT" (interest level: HOT = ready to close/procure, WARM = interested/evaluating, COLD = resistant/early)
}

Salesperson raw transcript:
"""
${validated.spokenText}
"""
Respond strictly with valid JSON.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        const rawText = response.text || "{}";
        const parsed = JSON.parse(rawText);

        extracted = {
          summaryRemarks: parsed.summaryRemarks || validated.spokenText,
          expectedPriceInr: typeof parsed.expectedPriceInr === "number" ? parsed.expectedPriceInr : null,
          quantityRequired: typeof parsed.quantityRequired === "number" ? parsed.quantityRequired : null,
          nextFollowUpDateIso: parsed.nextFollowUpDateIso || null,
          natureOfCall: ["COLD", "WARM", "HOT"].includes(parsed.natureOfCall)
            ? parsed.natureOfCall
            : "WARM",
        };
      } catch (geminiErr) {
        console.warn("Gemini 2.5 Flash call failed or timed out, engaging graceful fallback:", geminiErr);
        extracted = heuristicFallbackExtraction(validated.spokenText);
        isFallback = true;
      }
    } else {
      // Offline/sandbox heuristic fallback
      extracted = heuristicFallbackExtraction(validated.spokenText);
      isFallback = true;
    }

    // Atomic update of FieldMeetingVisit and Client records
    const updated = await prisma.$transaction(async (tx) => {
      const updatedVisit = await tx.fieldMeetingVisit.update({
        where: { id: visit.id },
        data: {
          rawVoiceTranscript: validated.spokenText,
          voiceNoteAudioUrl: validated.voiceNoteAudioUrl,
          aiExtractedJson: extracted as unknown as Prisma.InputJsonValue,
          meetingRemarks: extracted.summaryRemarks,
        },
      });

      const clientUpdateData: Prisma.ClientUpdateInput = {
        latestRemarks: extracted.summaryRemarks,
        natureOfCall: extracted.natureOfCall as CallNature,
      };

      if (extracted.nextFollowUpDateIso) {
        const followUpDate = new Date(extracted.nextFollowUpDateIso);
        if (!isNaN(followUpDate.getTime())) {
          clientUpdateData.nextFollowUpDate = followUpDate;
        }
      }

      const updatedClient = await tx.client.update({
        where: { id: validated.clientId },
        data: clientUpdateData,
      });

      return { visit: updatedVisit, client: updatedClient };
    });

    // Append-only Immutable Audit Log
    await logImmutableAudit({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      entityType: "FieldMeetingVisit",
      entityId: visit.id,
      action: "AI_VOICE_TO_CRM_EXTRACTION",
      oldValueJson: { meetingRemarks: visit.meetingRemarks },
      newValueJson: {
        isFallback,
        extracted,
        clientUpdatedId: validated.clientId,
      },
    });

    return NextResponse.json({
      success: true,
      isFallback,
      aiExtracted: extracted,
      visit: updated.visit,
      client: updated.client,
      message: isFallback
        ? "Voice transcript processed via local NLP engine (Gemini key not configured or offline)."
        : "Voice note structured extraction completed via Gemini 2.5 Flash.",
    });
  } catch (err: any) {
    console.error("Voice-to-CRM API Error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: err.flatten().fieldErrors }, { status: 422 });
    }
    return NextResponse.json({ error: err.message || "Failed to process voice note" }, { status: 500 });
  }
}
