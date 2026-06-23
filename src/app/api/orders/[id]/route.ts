import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { sendNotificationToMany } from '@/lib/notify'
import { hasRole, APPROVER_ROLES } from '@/lib/permissions'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const order = await prisma.order.findFirst({
    where: { id: params.id, companyId: (session.user as any).companyId },
    include: {
      project: { select: { id: true, name: true, projectNumber: true, address: true } },
      supplier: { select: { id: true, name: true } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (!order) return NextResponse.json({ error: '発注が見つかりません' }, { status: 404 })
  return NextResponse.json(order)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { subject, workType, amount, orderDate, deliveryDate, status, notes, supplierId, paymentTerms, items } = body

  if (status === '承認済' && !hasRole(session, APPROVER_ROLES)) {
    return NextResponse.json({ error: '承認権限が必要です' }, { status: 403 })
  }

  try {
    // Recalculate amount from items if provided
    let finalAmount = amount !== undefined ? Number(amount) : undefined
    if (items !== undefined && items.length > 0) {
      finalAmount = items.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0)
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...(subject !== undefined && { subject }),
        ...(workType !== undefined && { workType: workType || null }),
        ...(finalAmount !== undefined && {
          amount: finalAmount,
          taxAmount: Math.round(finalAmount * 0.1),
          totalAmount: finalAmount + Math.round(finalAmount * 0.1),
        }),
        ...(orderDate !== undefined && { orderDate: orderDate ? new Date(orderDate) : null }),
        ...(deliveryDate !== undefined && { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }),
        ...(paymentTerms !== undefined && { paymentTerms: paymentTerms || null }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(supplierId !== undefined && { supplierId: supplierId || null }),
        ...(items !== undefined && {
          items: {
            deleteMany: {},
            create: items.map((item: any, idx: number) => ({
              name: item.name,
              quantity: parseFloat(item.quantity) || 1,
              unitPrice: parseFloat(item.unitPrice) || 0,
              amount: parseFloat(item.amount) || 0,
              sortOrder: idx,
            })),
          },
        }),
      },
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
    // N-011: 承認依頼時、管理者全員に通知
    if (status === '承認依頼中') {
      const managers = await prisma.user.findMany({
        where: { companyId: (session.user as any).companyId, role: '管理者' },
        select: { id: true },
      })
      await sendNotificationToMany({
        userIds: managers.map(m => m.id),
        title: '発注承認依頼',
        content: `${(session.user as any).name || 'ユーザー'}から発注「${order.project?.name}」の承認依頼が届きました`,
        type: 'order_approval',
        link: '/orders',
      })
    }
    // N-012: 発注済確定時、現場監督・管理者に通知
    if (status === '発注済') {
      const notifyUsers = await prisma.user.findMany({
        where: {
          companyId: (session.user as any).companyId,
          role: { in: ['管理者', '現場監督'] },
        },
        select: { id: true },
      })
      const notifyIds = notifyUsers.map(u => u.id).filter(id => id !== (session.user as any).id)
      if (notifyIds.length > 0) {
        await sendNotificationToMany({
          userIds: notifyIds,
          title: '発注が確定しました',
          content: `発注「${order.subject}」（${order.project?.name}）が発注済になりました`,
          type: 'order',
          link: `/orders`,
        })
      }
    }

    if (status === '承認済' || status === '差戻し') {
      await logAudit({
        userId: (session.user as any).id,
        userName: (session.user as any).name || '',
        action: status === '承認済' ? 'APPROVE' : 'REJECT',
        target: '発注',
        targetId: params.id,
        detail: order.project?.name,
        companyId: (session.user as any).companyId,
      })
    } else {
      await logAudit({
        userId: (session.user as any).id,
        userName: (session.user as any).name || '',
        action: 'UPDATE',
        target: '発注',
        targetId: params.id,
        detail: order.project?.name,
        companyId: (session.user as any).companyId,
      })
    }
    return NextResponse.json(order)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    await prisma.order.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
