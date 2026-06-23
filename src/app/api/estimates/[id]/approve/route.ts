import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasRole } from '@/lib/permissions'

const APPROVER_ROLES = ['管理者', '会社管理者', '部門長'] as const

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!hasRole(session, APPROVER_ROLES)) {
    return NextResponse.json({ error: '承認権限が必要です' }, { status: 403 })
  }

  const user = session.user as any
  const estimate = await prisma.estimate.findFirst({
    where: { id: params.id, companyId: user.companyId },
  })
  if (!estimate) return NextResponse.json({ error: '見積が見つかりません' }, { status: 404 })

  const updated = await prisma.estimate.update({
    where: { id: params.id },
    data: {
      status: '承認済',
      approvedBy: user.name || user.email,
      approvedAt: new Date(),
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
    },
    include: {
      project: { select: { name: true, projectNumber: true, customer: { select: { name: true } } } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (estimate.createdBy) {
    const creator = await prisma.user.findFirst({
      where: { name: estimate.createdBy, companyId: user.companyId },
    })
    if (creator) {
      await prisma.notification.create({
        data: {
          userId: creator.id,
          title: '見積が承認されました',
          content: `見積 ${estimate.estimateNumber} が承認されました`,
          type: 'estimate_approved',
          link: '/estimates',
        },
      })
    }
  }

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!hasRole(session, APPROVER_ROLES)) {
    return NextResponse.json({ error: '却下権限が必要です' }, { status: 403 })
  }

  const user = session.user as any
  const body = await req.json()
  const { rejectionReason } = body

  const estimate = await prisma.estimate.findFirst({
    where: { id: params.id, companyId: user.companyId },
  })
  if (!estimate) return NextResponse.json({ error: '見積が見つかりません' }, { status: 404 })

  const updated = await prisma.estimate.update({
    where: { id: params.id },
    data: {
      status: '却下',
      rejectedBy: user.name || user.email,
      rejectedAt: new Date(),
      rejectionReason: rejectionReason || null,
      approvedBy: null,
      approvedAt: null,
    },
    include: {
      project: { select: { name: true, projectNumber: true, customer: { select: { name: true } } } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (estimate.createdBy) {
    const creator = await prisma.user.findFirst({
      where: { name: estimate.createdBy, companyId: user.companyId },
    })
    if (creator) {
      await prisma.notification.create({
        data: {
          userId: creator.id,
          title: '見積が却下されました',
          content: `見積 ${estimate.estimateNumber} が却下されました${rejectionReason ? `：${rejectionReason}` : ''}`,
          type: 'estimate_rejected',
          link: '/estimates',
        },
      })
    }
  }

  return NextResponse.json(updated)
}
