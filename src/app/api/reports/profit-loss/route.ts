import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)
  const companyId = session.user.companyId

  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`)
  const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`)

  const [invoices, orders] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId,
        invoiceDate: { gte: startOfYear, lt: endOfYear },
      },
      select: { invoiceDate: true, totalAmount: true },
    }),
    prisma.order.findMany({
      where: {
        companyId,
        orderDate: { gte: startOfYear, lt: endOfYear },
      },
      select: { orderDate: true, totalAmount: true },
    }),
  ])

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const revenue = invoices
      .filter(inv => inv.invoiceDate && new Date(inv.invoiceDate).getUTCMonth() + 1 === month)
      .reduce((s, inv) => s + inv.totalAmount, 0)
    const cost = orders
      .filter(ord => ord.orderDate && new Date(ord.orderDate).getUTCMonth() + 1 === month)
      .reduce((s, ord) => s + ord.totalAmount, 0)
    const grossProfit = revenue - cost
    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0
    return { month, revenue, cost, grossProfit, grossMarginPct }
  })

  const annualRevenue = months.reduce((s, m) => s + m.revenue, 0)
  const annualCost = months.reduce((s, m) => s + m.cost, 0)
  const annualGrossProfit = annualRevenue - annualCost
  const annualGrossMarginPct = annualRevenue > 0 ? (annualGrossProfit / annualRevenue) * 100 : 0

  return NextResponse.json({
    year,
    months,
    annual: {
      revenue: annualRevenue,
      cost: annualCost,
      grossProfit: annualGrossProfit,
      grossMarginPct: annualGrossMarginPct,
    },
  })
}
