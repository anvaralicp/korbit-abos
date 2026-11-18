import { prisma } from "@/lib/prisma";
import { RoleLevel, DepartmentType, VehicleType, Prisma } from "@prisma/client";

/**
 * Derives the organizational RoleLevel from numeric layer depth.
 * Hierarchy Map:
 *   1  -> LAYER_01_ADMIN
 *   2  -> LAYER_02_DEPT_HEAD
 *   3  -> LAYER_03_ZONE_MANAGER
 *   4  -> LAYER_04_REGION_MANAGER
 *   5  -> LAYER_05_CITY_MANAGER
 *   6  -> LAYER_06_EXECUTIVE
 *   >6 -> LAYER_N_SUBORDINATE
 */
export function deriveRoleLevelFromDepth(depth: number): RoleLevel {
  if (depth <= 1) return RoleLevel.LAYER_01_ADMIN;
  switch (depth) {
    case 2:
      return RoleLevel.LAYER_02_DEPT_HEAD;
    case 3:
      return RoleLevel.LAYER_03_ZONE_MANAGER;
    case 4:
      return RoleLevel.LAYER_04_REGION_MANAGER;
    case 5:
      return RoleLevel.LAYER_05_CITY_MANAGER;
    case 6:
      return RoleLevel.LAYER_06_EXECUTIVE;
    default:
      return RoleLevel.LAYER_N_SUBORDINATE;
  }
}

export interface SubordinateDataInput {
  employeeCode: string;
  fullName: string;
  email: string;
  mobile: string;
  designation: string;
  passwordHash: string;
  department?: DepartmentType;
  baseSalaryInr?: number | string | Prisma.Decimal;
  vehicleType?: VehicleType;
  postalAddress?: string | null;
  aadharProofEncrypted?: string | null;
  voterIdProofEncrypted?: string | null;
  photoUrl?: string | null;
  mustResetPassword?: boolean;
  zoneId?: string | null;
  stateRegionId?: string | null;
  divisionId?: string | null;
  roleLevel?: RoleLevel;
}

/**
 * Creates a subordinate employee inside the Dynamic Layer Detection (DLD) tree.
 * - Queries manager's `layerDepth` and `materializedPath`.
 * - Sets subordinate's `layerDepth = manager.layerDepth + 1`.
 * - Sets subordinate's `materializedPath = "${manager.materializedPath}${subordinate.id}/"`.
 * - Automatically derives the appropriate `roleLevel` unless explicitly overridden.
 */
export async function createSubordinateWithDLD(
  managerId: string,
  subordinateData: SubordinateDataInput
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch manager node in the hierarchy
    const manager = await tx.user.findUnique({
      where: { id: managerId },
      select: {
        id: true,
        tenantId: true,
        department: true,
        layerDepth: true,
        materializedPath: true,
        zoneId: true,
        stateRegionId: true,
        divisionId: true,
      },
    });

    if (!manager) {
      throw new Error(`Manager with ID "${managerId}" does not exist in hierarchy.`);
    }

    const subordinateDepth = manager.layerDepth + 1;
    const derivedRole = subordinateData.roleLevel ?? deriveRoleLevelFromDepth(subordinateDepth);
    const department = subordinateData.department ?? manager.department;

    // 2. Insert record with a temporary placeholder path to obtain the generated ID
    const createdUser = await tx.user.create({
      data: {
        tenantId: manager.tenantId,
        managerId: manager.id,
        employeeCode: subordinateData.employeeCode,
        fullName: subordinateData.fullName,
        email: subordinateData.email,
        mobile: subordinateData.mobile,
        designation: subordinateData.designation,
        passwordHash: subordinateData.passwordHash,
        department,
        roleLevel: derivedRole,
        layerDepth: subordinateDepth,
        materializedPath: `${manager.materializedPath}TEMP/`,
        baseSalaryInr: subordinateData.baseSalaryInr !== undefined ? subordinateData.baseSalaryInr : 0,
        vehicleType: subordinateData.vehicleType ?? VehicleType.FOUR_WHEELER,
        postalAddress: subordinateData.postalAddress,
        aadharProofEncrypted: subordinateData.aadharProofEncrypted,
        voterIdProofEncrypted: subordinateData.voterIdProofEncrypted,
        photoUrl: subordinateData.photoUrl,
        mustResetPassword: subordinateData.mustResetPassword ?? true,
        zoneId: subordinateData.zoneId ?? manager.zoneId,
        stateRegionId: subordinateData.stateRegionId ?? manager.stateRegionId,
        divisionId: subordinateData.divisionId ?? manager.divisionId,
      },
    });

    // 3. Set the immutable materialized path: "${manager.materializedPath}${subordinate.id}/"
    const finalMaterializedPath = `${manager.materializedPath}${createdUser.id}/`;

    const updatedUser = await tx.user.update({
      where: { id: createdUser.id },
      data: { materializedPath: finalMaterializedPath },
    });

    return updatedUser;
  });
}

/**
 * Returns Prisma filter for Deal/Sales reports visibility.
 * Accessible strictly only to the immediate reporting officer and higher officers in the chain.
 *
 * Query: `{ owner: { materializedPath: { startsWith: currentUser.materializedPath } } }`
 */
export function getSubordinateVisibilityFilter(currentUser: {
  materializedPath: string;
}) {
  return {
    owner: {
      materializedPath: {
        startsWith: currentUser.materializedPath,
      },
    },
  };
}

/**
 * Returns Prisma filter for Direct Subordinates and Indirect Team Members in User queries.
 */
export function getUserSubordinatesFilter(currentUser: {
  materializedPath: string;
}) {
  return {
    materializedPath: {
      startsWith: currentUser.materializedPath,
    },
  };
}

/**
 * Returns Prisma filter for Client records created by user or team in their command chain.
 */
export function getClientVisibilityFilter(currentUser: {
  materializedPath: string;
}) {
  return {
    createdBy: {
      materializedPath: {
        startsWith: currentUser.materializedPath,
      },
    },
  };
}

/**
 * Utility to verify if an officer is higher in the chain of command above a target employee.
 */
export function isOfficerAboveInChain(
  seniorOfficer: { materializedPath: string },
  targetEmployee: { materializedPath: string }
): boolean {
  if (seniorOfficer.materializedPath === targetEmployee.materializedPath) {
    return true; // Self
  }
  return targetEmployee.materializedPath.startsWith(seniorOfficer.materializedPath);
}
