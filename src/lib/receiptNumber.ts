import { Prisma } from '@prisma/client'

/**
 * Returns the next sequential receipt number for a tenant.
 * - Tenant 1: "RSS Public Higher Secondary School" (starts from 1001, sequentially: 1001, 1002, ...)
 * - Tenant 2: "RSS Public School" (starts from 001 / 0001, sequentially: 0027, 0028, ... undisturbed)
 */
export async function getNextReceiptNumber(
  tx: Prisma.TransactionClient,
  tenantId: string,
  year?: number
): Promise<string> {
  const currentYear = year || new Date().getFullYear()
  const prefix = `REC-${currentYear}-`

  // Fetch tenant info to distinguish Tenant 1 from Tenant 2
  const tenant = await tx.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true },
  })

  const isHigherSecondary =
    tenant?.id === 'cmuv23jwe000004l8lg5f1kr1' ||
    /higher\s*secondary/i.test(tenant?.name || '') ||
    tenant?.slug === 'rss-public-school'

  // Fetch all existing receipts for this tenant and year to find the true max numeric sequence
  const existingPayments = await tx.payment.findMany({
    where: { tenantId, receiptNo: { startsWith: prefix } },
    select: { receiptNo: true },
  })

  let maxNum = 0
  for (const p of existingPayments) {
    if (p.receiptNo) {
      const parts = p.receiptNo.split('-')
      const num = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(num) && num > maxNum) {
        maxNum = num
      }
    }
  }

  let nextNum: number
  if (isHigherSecondary) {
    // Tenant 1 (RSS Public Higher Secondary School): Start at 1001
    nextNum = maxNum >= 1001 ? maxNum + 1 : 1001
  } else {
    // Tenant 2 (RSS Public School): Start at 1 (0001) - continue existing sequence undisturbed
    nextNum = maxNum >= 1 ? maxNum + 1 : 1
  }

  return `${prefix}${nextNum.toString().padStart(4, '0')}`
}

