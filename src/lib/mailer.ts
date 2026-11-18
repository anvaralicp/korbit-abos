import nodemailer from "nodemailer";

interface SmtpConfig {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && host.trim() !== "" && !host.includes("placeholder")) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
  }

  return null; // Local mock mode
}

const DEFAULT_FROM = process.env.SMTP_FROM || "KORBIT ABOS <notifications@korbit.in>";

/**
 * Sends or mocks an email message safely
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
}): Promise<{ success: boolean; messageId: string }> {
  const transporter = getTransporter();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: DEFAULT_FROM,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.warn("SMTP send failed, falling back to console dispatch:", err);
    }
  }

  // Local development / mock fallback
  const mockId = `mock_msg_${Date.now()}`;
  console.log("📧 [TRANSACTIONAL EMAIL DISPATCH]");
  console.log(`   To:      ${options.to}`);
  console.log(`   Subject: ${options.subject}`);
  console.log(`   Body:    ${options.text.slice(0, 150)}...`);
  if (options.attachments && options.attachments.length > 0) {
    console.log(`   Attachments: ${options.attachments.map((a) => a.filename).join(", ")}`);
  }

  return { success: true, messageId: mockId };
}

/**
 * 1. Department Head 72-Hour Onboarding Invite Email
 */
export async function sendDepartmentHeadInviteEmail(params: {
  recipientEmail: string;
  recipientName: string;
  designation: string;
  department: string;
  companyName: string;
  temporaryPassword: string;
  loginUrl?: string;
}) {
  const loginUrl = params.loginUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`;

  const subject = `Welcome to ${params.companyName} Management Team - KORBIT ABOS Access`;

  const text = `Dear ${params.recipientName},

You have been appointed as ${params.designation} (${params.department}) at ${params.companyName}.

Your administrative account has been provisioned on KORBIT Autonomous Business Operating System (ABOS).

Login Details:
• Portal URL: ${loginUrl}
• Username / Email: ${params.recipientEmail}
• Temporary Password: ${params.temporaryPassword}

IMPORTANT SECURITY NOTICE:
Your temporary password is valid for 72 hours. You will be prompted to set your personal password upon your first sign-in.

Best regards,
${params.companyName} Administration
Powered by KORBIT ABOS`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
      <div style="background: #0f172a; padding: 20px; border-radius: 12px 12px 0 0; color: #ffffff;">
        <h2 style="margin: 0; font-size: 18px; color: #38bdf8;">KORBIT ABOS • Management Onboarding</h2>
      </div>
      <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; background: #ffffff;">
        <p>Dear <strong>${params.recipientName}</strong>,</p>
        <p>You have been appointed as <strong>${params.designation}</strong> (Department: <em>${params.department}</em>) at <strong>${params.companyName}</strong>.</p>
        
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #0f172a;">Your Credentials:</h4>
          <p style="margin: 4px 0;"><strong>Portal URL:</strong> <a href="${loginUrl}" style="color: #0284c7;">${loginUrl}</a></p>
          <p style="margin: 4px 0;"><strong>Username:</strong> ${params.recipientEmail}</p>
          <p style="margin: 4px 0;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${params.temporaryPassword}</code></p>
        </div>

        <p style="color: #e11d48; font-size: 12px;"><strong>Security Notice:</strong> Your temporary password expires in 72 hours. Please reset your password on first login.</p>
        <p style="margin-top: 24px;">Best regards,<br><strong>${params.companyName} Administration</strong></p>
      </div>
    </div>
  `;

  return sendEmail({ to: params.recipientEmail, subject, text, html });
}

/**
 * 2. Client Introductory Email (Exact Specification Template)
 */
export async function sendClientIntroductoryEmail(params: {
  recipientEmail: string;
  contactPerson: string;
  clientCompanyName: string;
  senderCompanyName: string;
  salespersonName: string;
  salespersonMobile: string;
  productName?: string;
}) {
  const subject = `Introduction - ${params.senderCompanyName} reaching out to ${params.clientCompanyName}`;

  const productRef = params.productName || "our enterprise solutions and products";

  const text = `Dear ${params.contactPerson},

Thank you for your interest in ${productRef}. I'm ${params.salespersonName} from ${params.senderCompanyName}, and I'll be your primary point of contact.

We look forward to partnering with ${params.clientCompanyName} to deliver high-performance commercial solutions.

I will reach out shortly to coordinate an introductory discussion and understand your operational requirements. Should you have any immediate questions, feel free to contact me directly at ${params.salespersonMobile}.

Warm regards,
${params.salespersonName}
${params.senderCompanyName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
      <p>Dear <strong>${params.contactPerson}</strong>,</p>
      <p>Thank you for your interest in <strong>${productRef}</strong>. I'm <strong>${params.salespersonName}</strong> from <strong>${params.senderCompanyName}</strong>, and I'll be your primary point of contact.</p>
      <p>We look forward to partnering with <strong>${params.clientCompanyName}</strong> to deliver high-performance commercial solutions.</p>
      <p>I will reach out shortly to coordinate an introductory discussion and understand your operational requirements. Should you have any immediate questions, feel free to contact me directly at <strong>${params.salespersonMobile}</strong>.</p>
      <p style="margin-top: 20px;">Warm regards,<br><strong>${params.salespersonName}</strong><br>${params.senderCompanyName}</p>
    </div>
  `;

  return sendEmail({ to: params.recipientEmail, subject, text, html });
}

/**
 * 3. Stage 4 Proposal PDF Email
 */
export async function sendProposalPdfEmail(params: {
  recipientEmail: string;
  contactPerson: string;
  dealCode: string;
  clientCompanyName: string;
  senderCompanyName: string;
  totalAmountInr: number;
  pdfBuffer: Buffer;
}) {
  const subject = `Commercial Proposal [${params.dealCode}] - ${params.senderCompanyName}`;

  const text = `Dear ${params.contactPerson},

Please find attached our formal commercial proposal (${params.dealCode}) for ${params.clientCompanyName}.

Summary:
• Total Proposal Value: INR ${params.totalAmountInr.toLocaleString("en-IN")} (inclusive of statutory GST)
• Proposal Validity: 30 days from issuance date

Please review the attached PDF document for comprehensive line items, delivery timelines, and terms.

Best regards,
${params.senderCompanyName} Commercial Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
      <p>Dear <strong>${params.contactPerson}</strong>,</p>
      <p>Please find attached our formal commercial proposal (<strong>${params.dealCode}</strong>) for <strong>${params.clientCompanyName}</strong>.</p>
      
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Proposal Code:</strong> ${params.dealCode}</p>
        <p style="margin: 4px 0;"><strong>Total Amount:</strong> INR ${params.totalAmountInr.toLocaleString("en-IN")}</p>
        <p style="margin: 4px 0;"><strong>Validity:</strong> 30 Days</p>
      </div>

      <p>Please review the attached PDF document for comprehensive line items, delivery timelines, and commercial terms.</p>
      <p style="margin-top: 20px;">Best regards,<br><strong>${params.senderCompanyName} Commercial Team</strong></p>
    </div>
  `;

  return sendEmail({
    to: params.recipientEmail,
    subject,
    text,
    html,
    attachments: [
      {
        filename: `Proposal-${params.dealCode}.pdf`,
        content: params.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}
