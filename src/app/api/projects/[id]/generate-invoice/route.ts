import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
    include: { company: { select: { defaultPaymentTerms: true } } },
  })
  if (!project) return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })

  const approvedOrders = await prisma.order.findMany({
    where: { projectId: params.id, status: '承認済', companyId: session.user.companyId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  })

  if (approvedOrders.length === 0) {
    return NextResponse.json({ error: '承認済の発注がありません' }, { status: 400 })
  }

  const amount = approvedOrders.reduce((sum, o) => sum + (o.amount || 0), 0)
  const taxAmount = Math.round(amount * 0.1)
  const totalAmount = amount + taxAmount

  const count = await prisma.invoice.count({ where: { companyId: session.user.companyId } })
  const invoiceNumber = `I-${String(count + 1).padStart(3, '0')}`

  const paymentTerms = project.company?.defaultPaymentTerms ?? 30
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + paymentTerms)

  const invoiceItems: { name: string; quantity: number; unitPrice: number; amount: number; sortOrder: number }[] = []
  let sortIdx = 0
  for (const order of approvedOrders) {
    if (order.items.length > 0) {
      for (const item of order.items) {
        invoiceItems.push({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          sortOrder: sortIdx++,
        })
      }
    } else {
      invoiceItems.push({
        name: order.subject,
        quantity: 1,
        unitPrice: order.amount,
        amount: order.amount,
        sortOrder: sortIdx++,
      })
    }
  }

  const invoice = await prisma.invoice.create({
    data: {
      projectId: params.id,
      customerId: project.customerId || null,
      invoiceNumber,
      dueDate,
      amount,
      taxAmount,
      totalAmount,
      status: '未承認',
      companyId: session.user.companyId,
      items: { create: invoiceItems },
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      customer: { select: { id: true, name: true } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })

  return NextResponse.json(invoice, { status: 201 })
}
