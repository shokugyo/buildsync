import { prisma } from './prisma'

export async function logAudit({
  userId,
  userName,
  action,
  target,
  targetId,
  detail,
  companyId,
}: {
  userId: string
  userName: string
  action: string
  target: string
  targetId?: string
  detail?: string
  companyId: string
}) {
  try {
    await prisma.auditLog.create({
      data: { userId, userName, action, target, targetId: targetId || null, detail: detail || null, companyId },
    })
  } catch {
    // ログ失敗は握りつぶす（本処理に影響させない）
  }
}
