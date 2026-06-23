import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
    select: {
      id: true,
      name: true,
      projectNumber: true,
      contractAmount: true,
      startDate: true,
      endDate: true,
      deliveryDate: true,
      customer: { select: { id: true, name: true } },
    },
  })

  if (!project) return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })

  const orders = await prisma.order.findMany({
    where: { projectId: params.id, companyId: session.user.companyId },
    select: { totalAmount: true },
  })

  const invoices = await prisma.invoice.findMany({
    where: { projectId: params.id, companyId: session.user.companyId },
    select: { totalAmount: true, status: true, payments: { select: { amount: true } } },
  })

  const totalOrdered = orders.reduce((s, o) => s + o.totalAmount, 0)
  const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0)
  const totalPaid = invoices.reduce((s, i) => s + i.payments.reduce((ps, p) => ps + p.amount, 0), 0)
  const unpaidAmount = totalInvoiced - totalPaid
  const contractAmount = project.contractAmount ?? 0
  const grossProfit = contractAmount - totalOrdered
  const grossMarginPct = contractAmount > 0 ? (grossProfit / contractAmount) * 100 : 0

  return NextResponse.json({
    project,
    contractAmount,
    totalOrdered,
    totalInvoiced,
    totalPaid,
    grossProfit,
    grossMarginPct,
    unpaidAmount,
  })
}
