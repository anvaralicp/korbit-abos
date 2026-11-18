import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSubordinateWithDLD } from "@/lib/dld-hierarchy";
import { hashPassword, generateTemporaryPassword } from "@/lib/auth-utils";
import { logImmutableAudit } from "@/lib/audit";
import { sendDepartmentHeadInviteEmail } from "@/lib/mailer";
import { DepartmentType, RoleLevel, ZoneCode } from "@prisma/client";

const HeadSchema = z.object({
  fullName: z.string().min(2, "Full name required"),
  email: z.string().email("Valid email required"),
  mobile: z.string().min(10, "Valid 10-digit phone required"),
  designation: z.string().default("Head of Department"),
});

const DivisionSchema = z.object({
  divisionName: z.string().min(2, "Division name must be at least 2 characters"),
});

const StateSchema = z.object({
  stateName: z.string().min(2, "State name is required"),
  divisions: z.array(DivisionSchema).min(4, "Each state must have at least 4 state division records"),
});

const ZoneSetupSchema = z.object({
  zoneCode: z.nativeEnum(ZoneCode),
  name: z.string().min(2),
  states: z.array(StateSchema).min(1, "Zone must have at least 1 state"),
});

const SetupOrgSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  salesHead: HeadSchema,
  hrHead: HeadSchema,
  commercialHead: HeadSchema,
  zones: z.array(ZoneSetupSchema).max(5, "Maximum 5 zones allowed").optional(),
});

// Standard Default 5-Zone Pan-India Hierarchy (Minimum 4 divisions per state)
const DEFAULT_ZONES_CONFIG: z.infer<typeof ZoneSetupSchema>[] = [
  {
    zoneCode: ZoneCode.SOUTH,
    name: "South Zone",
    states: [
      {
        stateName: "Kerala",
        divisions: [
          { divisionName: "Thiruvananthapuram Division" },
          { divisionName: "Kochi (Ernakulam) Division" },
          { divisionName: "Kozhikode Division" },
          { divisionName: "Kollam Division" },
        ],
      },
      {
        stateName: "Tamil Nadu",
        divisions: [
          { divisionName: "Chennai Central & North" },
          { divisionName: "Chennai South & OMR Corridor" },
          { divisionName: "Coimbatore Industrial Division" },
          { divisionName: "Madurai Division" },
        ],
      },
      {
        stateName: "Karnataka",
        divisions: [
          { divisionName: "Bengaluru Central & CBD" },
          { divisionName: "Bengaluru East & Whitefield" },
          { divisionName: "Mysuru Division" },
          { divisionName: "Hubballi-Dharwad Division" },
        ],
      },
    ],
  },
  {
    zoneCode: ZoneCode.NORTH,
    name: "North Zone",
    states: [
      {
        stateName: "Delhi NCR",
        divisions: [
          { divisionName: "New Delhi Central Division" },
          { divisionName: "South Delhi & Gurugram Hub" },
          { divisionName: "Noida & Greater Noida Zone" },
          { divisionName: "West Delhi & Faridabad Belt" },
        ],
      },
      {
        stateName: "Punjab",
        divisions: [
          { divisionName: "Ludhiana Commercial Division" },
          { divisionName: "Amritsar Division" },
          { divisionName: "Jalandhar Division" },
          { divisionName: "Mohali & Tricity Hub" },
        ],
      },
    ],
  },
  {
    zoneCode: ZoneCode.WEST,
    name: "West Zone",
    states: [
      {
        stateName: "Maharashtra",
        divisions: [
          { divisionName: "Mumbai South & BKC Financial Hub" },
          { divisionName: "Mumbai Western Suburbs & Thane" },
          { divisionName: "Pune City & Hinjewadi Tech Park" },
          { divisionName: "Nagpur Division" },
        ],
      },
      {
        stateName: "Gujarat",
        divisions: [
          { divisionName: "Ahmedabad Central & SG Highway" },
          { divisionName: "Surat Textile & Diamond Hub" },
          { divisionName: "Vadodara Division" },
          { divisionName: "Rajkot Industrial Division" },
        ],
      },
    ],
  },
  {
    zoneCode: ZoneCode.EAST,
    name: "East Zone",
    states: [
      {
        stateName: "West Bengal",
        divisions: [
          { divisionName: "Kolkata Central & BBD Bagh" },
          { divisionName: "Salt Lake Sector V & New Town" },
          { divisionName: "Howrah Industrial Belt" },
          { divisionName: "Siliguri North Bengal Division" },
        ],
      },
      {
        stateName: "Odisha",
        divisions: [
          { divisionName: "Bhubaneswar Smart City Hub" },
          { divisionName: "Cuttack Twin City Division" },
          { divisionName: "Rourkela Steel Belt" },
          { divisionName: "Berhampur Division" },
        ],
      },
    ],
  },
  {
    zoneCode: ZoneCode.NORTHEAST,
    name: "Northeast Zone",
    states: [
      {
        stateName: "Assam",
        divisions: [
          { divisionName: "Guwahati Commercial Corridor" },
          { divisionName: "Dibrugarh Division" },
          { divisionName: "Silchar Division" },
          { divisionName: "Jorhat Division" },
        ],
      },
    ],
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = SetupOrgSchema.parse(body);

    // 1. Verify Tenant and Admin
    const tenant = await prisma.tenant.findUnique({
      where: { id: validated.tenantId },
      include: {
        users: {
          where: { layerDepth: 1 },
          take: 1,
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant organization not found" }, { status: 404 });
    }

    if (!tenant.isTeamSetupUnlocked) {
      return NextResponse.json(
        { error: "Subscription payment is pending. Please complete billing verification before configuring organizational hierarchy." },
        { status: 403 }
      );
    }

    const admin = tenant.users[0];
    if (!admin) {
      return NextResponse.json({ error: "Admin account not found for this tenant." }, { status: 404 });
    }

    // 2. Validate divisions count (must be >= 4 per state)
    const zonesToSetup = validated.zones && validated.zones.length > 0 ? validated.zones : DEFAULT_ZONES_CONFIG;

    for (const zItem of zonesToSetup) {
      for (const st of zItem.states) {
        if (!st.divisions || st.divisions.length < 4) {
          return NextResponse.json(
            { error: `Validation Error: State "${st.stateName}" in Zone "${zItem.name}" has only ${st.divisions?.length ?? 0} divisions. Minimum 4 State Divisions are mandatory.` },
            { status: 400 }
          );
        }
      }
    }

    // 3. Create the 3 Layer 02 Department Heads under Admin using DLD
    const deptHeadsSpecs = [
      {
        department: DepartmentType.SALES,
        designation: validated.salesHead.designation || "Head of Sales & Business Development",
        fullName: validated.salesHead.fullName,
        email: validated.salesHead.email,
        mobile: validated.salesHead.mobile,
        codePrefix: "SAL",
      },
      {
        department: DepartmentType.HR,
        designation: validated.hrHead.designation || "Head of Human Resources",
        fullName: validated.hrHead.fullName,
        email: validated.hrHead.email,
        mobile: validated.hrHead.mobile,
        codePrefix: "HRD",
      },
      {
        department: DepartmentType.COMMERCIAL,
        designation: validated.commercialHead.designation || "Head of Commercial & Finance",
        fullName: validated.commercialHead.fullName,
        email: validated.commercialHead.email,
        mobile: validated.commercialHead.mobile,
        codePrefix: "COM",
      },
    ];

    const createdHeadsCredentials = [];
    const expiry72h = new Date(Date.now() + 72 * 60 * 60 * 1000);

    for (const headSpec of deptHeadsSpecs) {
      // Check if user with this email already exists
      const existing = await prisma.user.findUnique({
        where: { email: headSpec.email },
      });

      if (existing) {
        return NextResponse.json(
          { error: `User with email "${headSpec.email}" (${headSpec.department} Head) is already registered.` },
          { status: 400 }
        );
      }

      const tempPassword = generateTemporaryPassword();
      const codeSuffix = Math.floor(100 + Math.random() * 900);

      const subordinateUser = await createSubordinateWithDLD(admin.id, {
        employeeCode: `${headSpec.codePrefix}-${codeSuffix}`,
        fullName: headSpec.fullName,
        email: headSpec.email,
        mobile: headSpec.mobile,
        designation: headSpec.designation,
        department: headSpec.department,
        roleLevel: RoleLevel.LAYER_02_DEPT_HEAD,
        passwordHash: hashPassword(tempPassword),
        mustResetPassword: true,
      });

      // Update 72-hour invite expiry
      await prisma.user.update({
        where: { id: subordinateUser.id },
        data: { inviteExpiresAt: expiry72h },
      });

      createdHeadsCredentials.push({
        id: subordinateUser.id,
        employeeCode: subordinateUser.employeeCode,
        fullName: subordinateUser.fullName,
        email: subordinateUser.email,
        department: subordinateUser.department,
        roleLevel: subordinateUser.roleLevel,
        layerDepth: subordinateUser.layerDepth,
        materializedPath: subordinateUser.materializedPath,
        temporaryPassword: tempPassword,
        inviteExpiresAt: expiry72h.toISOString(),
      });

      // Dispatch 72-hour transactional invitation email
      sendDepartmentHeadInviteEmail({
        recipientEmail: subordinateUser.email,
        recipientName: subordinateUser.fullName,
        designation: headSpec.designation,
        department: headSpec.department,
        companyName: tenant.companyName,
        temporaryPassword: tempPassword,
      }).catch((mailErr) => console.warn("Failed to dispatch head invite email:", mailErr));
    }

    // 4. Create Zone, StateRegion, and StateDivision hierarchy
    let totalZonesCreated = 0;
    let totalStatesCreated = 0;
    let totalDivisionsCreated = 0;

    for (const zData of zonesToSetup) {
      const zone = await prisma.zone.upsert({
        where: {
          tenantId_zoneCode: {
            tenantId: tenant.id,
            zoneCode: zData.zoneCode,
          },
        },
        update: {
          name: zData.name,
        },
        create: {
          tenantId: tenant.id,
          zoneCode: zData.zoneCode,
          name: zData.name,
        },
      });
      totalZonesCreated++;

      for (const sData of zData.states) {
        const state = await prisma.stateRegion.upsert({
          where: {
            zoneId_stateName: {
              zoneId: zone.id,
              stateName: sData.stateName,
            },
          },
          update: {},
          create: {
            tenantId: tenant.id,
            zoneId: zone.id,
            stateName: sData.stateName,
          },
        });
        totalStatesCreated++;

        for (const dData of sData.divisions) {
          await prisma.stateDivision.upsert({
            where: {
              stateRegionId_divisionName: {
                stateRegionId: state.id,
                divisionName: dData.divisionName,
              },
            },
            update: {},
            create: {
              tenantId: tenant.id,
              stateRegionId: state.id,
              divisionName: dData.divisionName,
            },
          });
          totalDivisionsCreated++;
        }
      }
    }

    // 5. Append-only Immutable Audit Log
    await logImmutableAudit({
      tenantId: tenant.id,
      actorId: admin.id,
      entityType: "Tenant",
      entityId: tenant.id,
      action: "ORGANIZATION_SETUP_COMPLETED",
      oldValueJson: { isConfigured: false },
      newValueJson: {
        departmentHeadsCount: createdHeadsCredentials.length,
        totalZonesCreated,
        totalStatesCreated,
        totalDivisionsCreated,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Organization hierarchy & geographic zones setup completed successfully.",
      tenantId: tenant.id,
      departmentHeads: createdHeadsCredentials,
      hierarchySummary: {
        zonesCount: totalZonesCreated,
        statesCount: totalStatesCreated,
        divisionsCount: totalDivisionsCreated,
      },
    });
  } catch (error: unknown) {
    console.error("Setup organization error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 422 }
      );
    }
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
