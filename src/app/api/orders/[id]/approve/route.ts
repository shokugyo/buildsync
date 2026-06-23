import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { action, comment } = await req.json()
  if (!action || !['承認', '差し戻し'].includes(action)) {
    return NextResponse.json({ error: 'actionは"承認"または"差し戻し"を指定してください' }, { status: 400 })
  }

  const order = await prisma.order.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
    include: { approvals: true },
  })
  if (!order) return NextResponse.json({ error: '発注が見つかりません' }, { status: 404 })

  const approverId = (session.user as any).id

  if (action === '差し戻し') {
    await prisma.orderApproval.create({
      data: {
        orderId: order.id,
        approverId,
        level: 1,
        action: '差し戻し',
        comment: comment || null,
      },
    })
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: '差し戻し' },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        supplier: { select: { id: true, name: true } },
        items: { orderBy: { sortOrder: 'asc' } },
        approvals: {
          include: { approver: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    return NextResponse.json(updated)
  }

  // action === '承認'
  const requiresTwoLevels = order.totalAmount >= 500000
  const existingLevel1 = order.approvals.find(a => a.action === '承認' && a.level === 1)

  let approvalLevel = 1
  let newStatus = '承認済'

  if (requiresTwoLevels) {
    if (!existingLevel1) {
      // 1回目の承認（レベル1）
      approvalLevel = 1
      newStatus = '承認依頼中' // まだ2段階目が必要なのでステータスはそのまま
    } else {
      // 2回目の承認（レベル2）
      approvalLevel = 2
      newStatus = '承認済'
    }
  } else {
    // 50万未満 → レベル1で完了
    approvalLevel = 1
    newStatus = '承認済'
  }

  await prisma.orderApproval.create({
    data: {
      orderId: order.id,
      approverId,
      level: approvalLevel,
      action: '承認',
      comment: comment || null,
    },
  })

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: newStatus },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      supplier: { select: { id: true, name: true } },
      items: { orderBy: { sortOrder: 'asc' } },
      approvals: {
        include: { approver: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  return NextResponse.json(updated)
}
