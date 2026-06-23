import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendNotificationToMany } from '@/lib/notify'
import { hasRole } from '@/lib/permissions'

const SUPPLIER_ROLES = ['協力会社管理者', '協力会社作業者'] as const

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  if (!hasRole(session, SUPPLIER_ROLES)) {
    return NextResponse.json({ error: '納品報告権限がありません' }, { status: 403 })
  }

  const companyId = (session.user as any).companyId

  const existing = await prisma.order.findFirst({
    where: { id: params.id, companyId },
    include: {
      project: { select: { id: true, name: true, managerId: true } },
      supplier: { select: { id: true, name: true } },
    },
  })
  if (!existing) return NextResponse.json({ error: '発注が見つかりません' }, { status: 404 })
  if (existing.status !== '発注済') {
    return NextResponse.json({ error: '発注済の発注のみ納品報告できます' }, { status: 400 })
  }
  if (!existing.confirmedAt) {
    return NextResponse.json({ error: '受注確認後に納品報告できます' }, { status: 400 })
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: {
      deliveredAt: new Date(),
      status: '納品済',
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      supplier: { select: { id: true, name: true } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })

  const managerId = existing.project?.managerId
  if (managerId) {
    await sendNotificationToMany({
      userIds: [managerId],
      title: '納品報告が届きました',
      content: `「${existing.subject}」（${existing.project?.name}）の納品が完了しました`,
      type: 'order',
      link: `/orders`,
    })
  }

  return NextResponse.json(updated)
}
