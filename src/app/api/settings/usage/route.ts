import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const [projectCount, userCount, photoCount, webhookLogCount] = await Promise.all([
    prisma.project.count({ where: { companyId, deletedAt: null } }),
    prisma.user.count({ where: { companyId, status: '有効' } }),
    prisma.photo.count({
      where: { project: { companyId } },
    }),
    prisma.webhookLog.count({
      where: {
        config: { companyId },
        sentAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
  ])

  const AVG_PHOTO_SIZE_MB = 3
  const storageUsedMB = photoCount * AVG_PHOTO_SIZE_MB

  return NextResponse.json({
    projectCount,
    userCount,
    photoCount,
    storageUsedMB,
    apiCallsThisMonth: webhookLogCount,
  })
}
