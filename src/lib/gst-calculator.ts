export interface GstCalculationResult {
  isInterState: boolean;
  subtotalInr: number;
  cgstInr: number;
  sgstInr: number;
  igstInr: number;
  totalGstInr: number;
  totalWithGstInr: number;
  taxLabel: string;
}

/**
 * Calculates Indian GST based on State of Supply rules:
 * - If Tenant Operating State matches Client State Region -> Intra-State (CGST + SGST split 50/50)
 * - If Tenant Operating State differs from Client State Region -> Inter-State (Full IGST)
 */
export function calculateGstBreakdown(
  subtotalInr: number,
  gstRatePercent: number,
  tenantOperatingState: string,
  clientStateName: string
): GstCalculationResult {
  const normTenant = tenantOperatingState.trim().toLowerCase();
  const normClient = clientStateName.trim().toLowerCase();
  const isInterState = normTenant !== normClient;

  const totalGstInr = Math.round((subtotalInr * gstRatePercent) / 100);

  let cgstInr = 0;
  let sgstInr = 0;
  let igstInr = 0;
  let taxLabel = "";

  if (isInterState) {
    igstInr = totalGstInr;
    taxLabel = `IGST (${gstRatePercent}%)`;
  } else {
    // Split 50:50
    cgstInr = Math.round(totalGstInr / 2);
    sgstInr = totalGstInr - cgstInr;
    const halfRate = gstRatePercent / 2;
    taxLabel = `CGST (${halfRate}%) + SGST (${halfRate}%)`;
  }

  const totalWithGstInr = subtotalInr + totalGstInr;

  return {
    isInterState,
    subtotalInr,
    cgstInr,
    sgstInr,
    igstInr,
    totalGstInr,
    totalWithGstInr,
    taxLabel,
  };
}
