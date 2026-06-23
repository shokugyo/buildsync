import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendNotificationToMany } from '@/lib/notify'
import { dispatchWebhook } from '@/lib/webhook'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const supplierId = searchParams.get('supplierId')
  const supplierView = searchParams.get('supplierView') === 'true'

  const userRole = (session.user as any).role
  const SUPPLIER_ROLES = ['協力会社管理者', '協力会社作業者']
  const isSupplierUser = SUPPLIER_ROLES.includes(userRole)

  try {
    const orders = await prisma.order.findMany({
      where: {
        companyId: session.user.companyId,
        ...(projectId && { projectId }),
        ...(supplierId && { supplierId }),
        ...(supplierView && isSupplierUser && {
          status: { in: ['発注済', '受領確認済', '納品済', '完了'] },
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
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(orders)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { items = [] } = body

  const count = await prisma.order.count({ where: { companyId: session.user.companyId } })
  const orderNumber = `ORD-${String(count + 1).padStart(3, '0')}`

  // Calculate totals from items if provided, otherwise use direct amount
  let amount = 0
  if (items.length > 0) {
    amount = items.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0)
  } else {
    amount = parseFloat(body.amount) || 0
  }
  const taxAmount = Math.round(amount * 0.1)
  const totalAmount = amount + taxAmount

  const order = await prisma.order.create({
    data: {
      projectId: body.projectId,
      supplierId: body.supplierId || null,
      orderNumber,
      subject: body.subject,
      workType: body.workType || null,
      orderDate: body.orderDate ? new Date(body.orderDate) : null,
      deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
      paymentTerms: body.paymentTerms || null,
      amount,
      taxAmount,
      totalAmount,
      status: body.status || '下書き',
      notes: body.notes || null,
      companyId: session.user.companyId,
      items: {
        create: items.map((item: any, idx: number) => ({
          name: item.name,
          quantity: parseFloat(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          amount: parseFloat(item.amount) || 0,
          sortOrder: idx,
        })),
      },
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

  // N-011: 発注承認依頼通知
  const orderStatus = body.status || '下書き'
  if (orderStatus === '承認依頼中') {
    const managers = await prisma.user.findMany({
      where: { companyId: (session.user as any).companyId, role: { in: ['管理者', '会社管理者'] } },
      select: { id: true },
    })
    const managerIds = managers.map(m => m.id).filter(id => id !== (session.user as any).id)
    if (managerIds.length > 0) {
      await sendNotificationToMany({
        userIds: managerIds,
        title: '発注承認依頼が届いています',
        content: `発注「${order.subject}」の承認をお願いします`,
        type: 'order_approval',
        link: `/orders`,
      })
    }
  }

  await dispatchWebhook(session.user.companyId, 'order.created', { id: order.id, orderNumber: order.orderNumber, subject: order.subject, totalAmount: order.totalAmount })

  return NextResponse.json(order, { status: 201 })
}
