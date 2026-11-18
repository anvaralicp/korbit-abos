import { PlanTier, BillingCycle } from "@prisma/client";

export interface PricingBreakdown {
  planTier: PlanTier;
  pricePerUserMonthlyInr: number;
  declaredEmployeeCount: number;
  billingCycle: BillingCycle;
  subtotalInr: number;
  discountPercent: number;
  discountAmountInr: number;
  netSubtotalInr: number;
  gstRatePercent: number;
  gstAmountInr: number;
  totalPayableInr: number;
  totalPayablePaise: number;
}

export function calculatePricing(
  employeeCount: number,
  billingCycle: BillingCycle = BillingCycle.MONTHLY
): PricingBreakdown {
  const count = Math.max(1, Math.floor(employeeCount));

  let planTier: PlanTier;
  let pricePerUserMonthlyInr: number;

  if (count <= 20) {
    planTier = PlanTier.BASIC;
    pricePerUserMonthlyInr = 299;
  } else if (count <= 100) {
    planTier = PlanTier.ADVANCED;
    pricePerUserMonthlyInr = 599;
  } else if (count <= 500) {
    planTier = PlanTier.PREMIUM;
    pricePerUserMonthlyInr = 999;
  } else {
    planTier = PlanTier.ENTERPRISE;
    pricePerUserMonthlyInr = 1499;
  }

  const isAnnual = billingCycle === BillingCycle.ANNUAL;
  const multiplier = isAnnual ? 12 : 1;
  const subtotalInr = count * pricePerUserMonthlyInr * multiplier;

  const discountPercent = isAnnual ? 10 : 0;
  const discountAmountInr = isAnnual ? Math.round(subtotalInr * 0.1) : 0;
  const netSubtotalInr = subtotalInr - discountAmountInr;

  const gstRatePercent = 18;
  const gstAmountInr = Math.round(netSubtotalInr * 0.18);
  const totalPayableInr = netSubtotalInr + gstAmountInr;
  const totalPayablePaise = totalPayableInr * 100;

  return {
    planTier,
    pricePerUserMonthlyInr,
    declaredEmployeeCount: count,
    billingCycle,
    subtotalInr,
    discountPercent,
    discountAmountInr,
    netSubtotalInr,
    gstRatePercent,
    gstAmountInr,
    totalPayableInr,
    totalPayablePaise,
  };
}
