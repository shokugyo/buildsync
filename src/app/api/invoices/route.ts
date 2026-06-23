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
  const customerId = searchParams.get('customerId')

  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId: session.user.companyId,
        ...(projectId && { projectId }),
        ...(customerId && { customerId }),
      },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        customer: { select: { id: true, name: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(invoices)
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

  const count = await prisma.invoice.count({ where: { companyId: session.user.companyId } })
  const invoiceNumber = `INV-${String(count + 1).padStart(3, '0')}`

  let amount = 0
  if (items.length > 0) {
    amount = items.reduce((s: number, it: any) => s + (parseFloat(it.amount) || 0), 0)
  } else {
    amount = parseFloat(body.amount) || 0
  }
  const taxAmount = Math.round(amount * 0.1)
  const totalAmount = amount + taxAmount

  const invoice = await prisma.invoice.create({
    data: {
      projectId: body.projectId,
      customerId: body.customerId || null,
      invoiceNumber,
      invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      amount,
      taxAmount,
      totalAmount,
      status: body.status || '未作成',
      notes: body.notes || null,
      companyId: session.user.companyId,
      items: {
        create: items.map((it: any, idx: number) => ({
          name: it.name,
          quantity: parseFloat(it.quantity) || 1,
          unitPrice: parseFloat(it.unitPrice) || 0,
          amount: parseFloat(it.amount) || 0,
          sortOrder: idx,
          taxRate: it.taxRate !== undefined ? parseFloat(it.taxRate) : 10,
        })),
      },
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      customer: { select: { id: true, name: true } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })

  // N-013: 請求承認依頼通知
  if ((body.status || '未作成') === '確認中') {
    const managers = await prisma.user.findMany({
      where: { companyId: (session.user as any).companyId, role: { in: ['管理者', '会社管理者'] } },
      select: { id: true },
    })
    const managerIds = managers.map(m => m.id).filter(id => id !== (session.user as any).id)
    if (managerIds.length > 0) {
      await sendNotificationToMany({
        userIds: managerIds,
        title: '請求書の承認依頼が届いています',
        content: `請求書「${invoice.invoiceNumber}」の確認をお願いします`,
        type: 'invoice_approval',
        link: `/invoices`,
      })
    }
  }

  await dispatchWebhook(session.user.companyId, 'invoice.created', { id: invoice.id, invoiceNumber: invoice.invoiceNumber, totalAmount: invoice.totalAmount })

  return NextResponse.json(invoice, { status: 201 })
}
