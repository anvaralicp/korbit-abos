import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { logImmutableAudit } from "@/lib/audit";
import { calculateGstBreakdown } from "@/lib/gst-calculator";
import { sendProposalPdfEmail } from "@/lib/mailer";
import { getPlatformBrandingConfig } from "@/lib/branding";
import { PipelineStage, CallNature } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        tenant: true,
        client: {
          include: {
            stateRegion: true,
            zone: true,
          },
        },
        owner: true,
        lineItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!deal || deal.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Auto-transition Deal stage to STAGE_4_PROPOSAL and natureOfCall to WARM
    const now = new Date();
    const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days validity

    await prisma.$transaction([
      prisma.deal.update({
        where: { id: deal.id },
        data: {
          stage: PipelineStage.STAGE_4_PROPOSAL,
          natureOfCall: CallNature.WARM,
          proposalSentAt: now,
          proposalValidUntil: validUntil,
        },
      }),
      prisma.client.update({
        where: { id: deal.clientId },
        data: {
          currentStage: PipelineStage.STAGE_4_PROPOSAL,
          statusLabel: "Proposal Stage",
        },
      }),
    ]);

    // Recalculate tax breakdown
    const isInterState =
      deal.tenant.operatingState.trim().toLowerCase() !==
      deal.client.stateRegion.stateName.trim().toLowerCase();

    // Fetch dynamic platform branding configuration
    const branding = await getPlatformBrandingConfig();

    // Generate PDF using PDFKit
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Header Banner
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .text(deal.tenant.companyName.toUpperCase(), 40, 40);

      if (branding.allowTenantPdfLogo && deal.tenant.companyLogoUrl) {
        doc
          .fontSize(8)
          .font("Helvetica-Oblique")
          .fillColor("#64748b")
          .text(`[Verified Tenant Corporate Entity • Logo Ref: ${deal.tenant.companyLogoUrl}]`, 40, 62);
      }

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#64748b")
        .text(`Commercial Operating State: ${deal.tenant.operatingState} | Country: ${deal.tenant.countryRegion}`);

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#2563eb")
        .text("COMMERCIAL BUSINESS PROPOSAL", 40, 75, { align: "right" });

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#475569")
        .text(`Proposal Ref: ${deal.dealCode}`, { align: "right" })
        .text(`Date of Issue: ${now.toLocaleDateString("en-IN")}`, { align: "right" })
        .text(`Validity: Prices valid for 30 days (Until ${validUntil.toLocaleDateString("en-IN")})`, { align: "right" });

      doc.moveDown(1.5);
      doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(40, 115).lineTo(555, 115).stroke();

      // Client & Proposal Recipient Info
      doc.moveDown(1);
      const startY = 125;
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .text("CLIENT / PROPOSAL RECIPIENT:", 40, startY);

      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#1e293b")
        .text(deal.client.companyName, 40, startY + 16);

      doc
        .font("Helvetica")
        .fillColor("#475569")
        .text(`${deal.client.address}, ${deal.client.city}`)
        .text(`State: ${deal.client.stateRegion.stateName} (Zone: ${deal.client.zone.name})`)
        .text(`Contact Person: ${deal.client.contactName} (${deal.client.contactDesignation})`)
        .text(`Email: ${deal.client.contactEmail} | Mobile: ${deal.client.contactMobile}`)
        .text(`Client Code: ${deal.client.clientCode}`);

      // Salesperson Details
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .text("PROPOSAL PRESENTED BY:", 330, startY);

      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#1e293b")
        .text(deal.owner.fullName, 330, startY + 16);

      doc
        .font("Helvetica")
        .fillColor("#475569")
        .text(`Designation: ${deal.owner.designation}`)
        .text(`Employee Code: ${deal.owner.employeeCode}`)
        .text(`Email: ${deal.owner.email}`)
        .text(`Mobile: ${deal.owner.mobile}`);

      doc.moveDown(2);

      // Itemized Table Header
      const tableTop = 230;
      doc.rect(40, tableTop, 515, 20).fill("#f1f5f9");

      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .text("ITEM / SERVICE", 45, tableTop + 6)
        .text("HSN/SAC", 195, tableTop + 6)
        .text("QTY", 255, tableTop + 6)
        .text("RATE (INR)", 295, tableTop + 6)
        .text("DISC %", 365, tableTop + 6)
        .text("TAX %", 420, tableTop + 6)
        .text("TOTAL (INR)", 475, tableTop + 6);

      let currentY = tableTop + 24;

      deal.lineItems.forEach((li) => {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#1e293b")
          .text(li.product.name.slice(0, 28), 45, currentY)
          .text(li.product.hsnSacCode, 195, currentY)
          .text(`${li.quantity} ${li.product.unit}`, 255, currentY)
          .text(`₹${Number(li.offeredUnitPriceInr).toLocaleString("en-IN")}`, 295, currentY)
          .text(`${Number(li.discountPercent).toFixed(1)}%`, 365, currentY)
          .text(`${Number(li.gstRatePercent).toFixed(0)}%`, 420, currentY)
          .text(`₹${Number(li.lineTotalWithGstInr).toLocaleString("en-IN")}`, 475, currentY);

        currentY += 18;
      });

      doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(40, currentY).lineTo(555, currentY).stroke();
      currentY += 10;

      // Financial Summary Box
      const summaryX = 330;
      doc
        .fontSize(8.5)
        .font("Helvetica")
        .fillColor("#475569")
        .text("Gross Subtotal:", summaryX, currentY)
        .text(`₹${Number(deal.subtotalInr).toLocaleString("en-IN")}`, 475, currentY);

      currentY += 14;

      if (!isInterState) {
        doc
          .text("CGST (Intra-State 9%):", summaryX, currentY)
          .text(`₹${Number(deal.cgstInr).toLocaleString("en-IN")}`, 475, currentY);
        currentY += 14;

        doc
          .text("SGST (Intra-State 9%):", summaryX, currentY)
          .text(`₹${Number(deal.sgstInr).toLocaleString("en-IN")}`, 475, currentY);
        currentY += 14;
      } else {
        doc
          .text("IGST (Inter-State 18%):", summaryX, currentY)
          .text(`₹${Number(deal.igstInr).toLocaleString("en-IN")}`, 475, currentY);
        currentY += 14;
      }

      doc.rect(summaryX - 5, currentY, 230, 22).fill("#0f172a");
      doc
        .fontSize(9.5)
        .font("Helvetica-Bold")
        .fillColor("#ffffff")
        .text("TOTAL CONTRACT AMOUNT:", summaryX, currentY + 6)
        .text(`₹${Number(deal.totalAmountInr).toLocaleString("en-IN")}`, 475, currentY + 6);

      currentY += 35;

      // Deliverables Section (Auto-populated from Product Master)
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .text("1. SCOPE OF DELIVERABLES & SPECIFICATIONS", 40, currentY);

      currentY += 16;
      deal.lineItems.forEach((li) => {
        doc
          .fontSize(8.5)
          .font("Helvetica-Bold")
          .fillColor("#1e293b")
          .text(`• ${li.product.name}:`, 40, currentY);
        currentY += 12;
        doc
          .font("Helvetica")
          .fillColor("#475569")
          .text(li.product.deliverables, 50, currentY, { width: 500 });
        currentY += 28;
      });

      // Terms & Conditions (Auto-populated from Product Master)
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .text("2. COMMERCIAL TERMS & PAYMENT CONDITIONS", 40, currentY);

      currentY += 16;
      deal.lineItems.forEach((li) => {
        doc
          .fontSize(8.5)
          .font("Helvetica")
          .fillColor("#475569")
          .text(`• ${li.product.termsAndConditions}`, 50, currentY, { width: 500 });
        currentY += 20;
      });

      // Dynamic Footer Notice
      let footerNotice = "*This is a computer generated document. It is authentic without signature*";
      if (branding.showPoweredByFooter) {
        footerNotice += ` • Powered by ${branding.platformName} ${branding.badgeText}`;
      }
      doc
        .fontSize(8)
        .font("Helvetica-Oblique")
        .fillColor("#94a3b8")
        .text(
          footerNotice,
          40,
          780,
          { align: "center", width: 515 }
        );

      doc.end();
    });

    // Audit log
    await logImmutableAudit({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      entityType: "Deal",
      entityId: deal.id,
      action: "PROPOSAL_PDF_GENERATED",
      oldValueJson: { stage: deal.stage, natureOfCall: deal.natureOfCall },
      newValueJson: {
        stage: PipelineStage.STAGE_4_PROPOSAL,
        natureOfCall: CallNature.WARM,
        validUntil: validUntil.toISOString(),
      },
    });

    // Send transactional Proposal PDF Email
    (async () => {
      try {
        await sendProposalPdfEmail({
          recipientEmail: deal.client.contactEmail,
          contactPerson: deal.client.contactName,
          dealCode: deal.dealCode,
          clientCompanyName: deal.client.companyName,
          senderCompanyName: deal.tenant.companyName,
          totalAmountInr: Number(deal.totalAmountInr),
          pdfBuffer,
        });
      } catch (mailErr) {
        console.warn("Proposal email send error:", mailErr);
      }
    })();

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Proposal-${deal.dealCode}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("Proposal PDF Generation Error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate proposal PDF" }, { status: 500 });
  }
}
