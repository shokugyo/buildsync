import { prisma } from './prisma'

export async function logAudit({
  userId,
  userName,
  userEmail,
  action,
  target,
  targetId,
  targetName,
  detail,
  ipAddress,
  companyId,
}: {
  userId: string
  userName: string
  userEmail?: string
  action: string
  target: string
  targetId?: string
  targetName?: string
  detail?: string
  ipAddress?: string
  companyId: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        userName,
        userEmail: userEmail || null,
        action,
        target,
        targetId: targetId || null,
        targetName: targetName || null,
        detail: detail || null,
        ipAddress: ipAddress || null,
        companyId,
      },
    })
  } catch {
    // ログ失敗は握りつぶす（本処理に影響させない）
  }
}
