import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId: (session.user as any).companyId },
    select: { id: true },
  })
  if (!project) return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })

  const [orders, invoices, budgets] = await Promise.all([
    prisma.order.findMany({
      where: { projectId: params.id, companyId: (session.user as any).companyId },
      include: { supplier: { select: { name: true } } },
    }),
    prisma.invoice.findMany({
      where: { projectId: params.id, companyId: (session.user as any).companyId },
      include: {
        customer: { select: { name: true } },
        payments: true,
      },
    }),
    prisma.budget.findMany({
      where: { projectId: params.id, companyId: (session.user as any).companyId },
    }),
  ])

  type JournalEntry = {
    id: string
    date: Date
    type: string
    description: string
    amount: number
  }

  const entries: JournalEntry[] = []

  for (const o of orders) {
    if (o.orderDate) {
      entries.push({
        id: `order-${o.id}`,
        date: o.orderDate,
        type: '発注',
        description: `${o.supplier?.name ?? ''}　${o.subject}`,
        amount: o.totalAmount,
      })
    }
  }

  for (const inv of invoices) {
    if (inv.invoiceDate) {
      entries.push({
        id: `invoice-${inv.id}`,
        date: inv.invoiceDate,
        type: '請求',
        description: `${inv.customer?.name ?? ''}　${inv.invoiceNumber}`,
        amount: inv.totalAmount,
      })
    }
    for (const p of inv.payments) {
      entries.push({
        id: `payment-${p.id}`,
        date: p.paidAt,
        type: '入金',
        description: `${inv.customer?.name ?? ''}　${inv.invoiceNumber}`,
        amount: p.amount,
      })
    }
  }

  for (const b of budgets) {
    entries.push({
      id: `budget-${b.id}`,
      date: b.createdAt,
      type: '原価',
      description: `${b.category}${b.description ? '　' + b.description : ''}`,
      amount: b.amount,
    })
  }

  entries.sort((a, b) => a.date.getTime() - b.date.getTime())

  let balance = 0
  const entriesWithBalance = entries.map(e => {
    if (e.type === '入金') {
      balance += e.amount
    } else if (e.type === '請求') {
      balance += e.amount
    } else if (e.type === '発注') {
      balance -= e.amount
    } else if (e.type === '原価') {
      balance -= e.amount
    }
    return { ...e, date: e.date.toISOString(), balance }
  })

  const totalOrdered = orders.reduce((s, o) => s + o.totalAmount, 0)
  const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0)
  const totalPaid = invoices.flatMap(i => i.payments).reduce((s, p) => s + p.amount, 0)
  const totalCosts = budgets.reduce((s, b) => s + b.amount, 0)

  return NextResponse.json({
    entries: entriesWithBalance,
    totals: { ordered: totalOrdered, invoiced: totalInvoiced, paid: totalPaid, costs: totalCosts },
  })
}
