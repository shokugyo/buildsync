import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)
  const companyId = (session.user as any).companyId

  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`)
  const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`)

  const [customers, invoices, projects] = await Promise.all([
    prisma.customer.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, name: true },
    }),
    prisma.invoice.findMany({
      where: {
        companyId,
        invoiceDate: { gte: startOfYear, lt: endOfYear },
        customerId: { not: null },
      },
      select: { customerId: true, totalAmount: true },
    }),
    prisma.project.findMany({
      where: {
        companyId,
        deletedAt: null,
        customerId: { not: null },
      },
      select: {
        customerId: true,
        orders: {
          where: {
            orderDate: { gte: startOfYear, lt: endOfYear },
          },
          select: { totalAmount: true },
        },
      },
    }),
  ])

  const revenueByCustomer = new Map<string, number>()
  for (const inv of invoices) {
    if (inv.customerId) {
      revenueByCustomer.set(inv.customerId, (revenueByCustomer.get(inv.customerId) ?? 0) + inv.totalAmount)
    }
  }

  const costByCustomer = new Map<string, number>()
  const projectCountByCustomer = new Map<string, number>()
  for (const proj of projects) {
    if (proj.customerId) {
      const orderTotal = proj.orders.reduce((s, o) => s + o.totalAmount, 0)
      costByCustomer.set(proj.customerId, (costByCustomer.get(proj.customerId) ?? 0) + orderTotal)
      if (proj.orders.length > 0) {
        projectCountByCustomer.set(proj.customerId, (projectCountByCustomer.get(proj.customerId) ?? 0) + 1)
      }
    }
  }

  const allCustomerIds = new Set([
    ...Array.from(revenueByCustomer.keys()),
    ...Array.from(costByCustomer.keys()),
  ])

  const rows = Array.from(allCustomerIds).map(customerId => {
    const customer = customers.find(c => c.id === customerId)
    const revenue = revenueByCustomer.get(customerId) ?? 0
    const cost = costByCustomer.get(customerId) ?? 0
    const grossProfit = revenue - cost
    const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
    return {
      customerId,
      customerName: customer?.name ?? '不明',
      projectCount: projectCountByCustomer.get(customerId) ?? 0,
      revenue,
      cost,
      grossProfit,
      margin,
    }
  })

  rows.sort((a, b) => b.revenue - a.revenue)

  return NextResponse.json({ year, rows })
}
