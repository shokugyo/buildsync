import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)

  const now = new Date()
  const thisMonth = now.getMonth() // 0-indexed
  const startOfYear = new Date(year, 0, 1)
  const endOfYear = new Date(year + 1, 0, 1)
  const startOfMonth = new Date(year, thisMonth, 1)
  const endOfMonth = new Date(year, thisMonth + 1, 1)

  // ── Fetch raw data ────────────────────────────────────────────────
  const [invoices, orders, projects, invoicesUnpaid] = await Promise.all([
    // All invoices for the year (revenue)
    prisma.invoice.findMany({
      where: { companyId, invoiceDate: { gte: startOfYear, lt: endOfYear } },
      select: {
        invoiceDate: true,
        totalAmount: true,
        status: true,
        projectId: true,
        project: { select: { id: true, name: true, projectNumber: true } },
      },
    }),
    // All orders for the year (cost)
    prisma.order.findMany({
      where: { companyId, orderDate: { gte: startOfYear, lt: endOfYear } },
      select: { orderDate: true, totalAmount: true },
    }),
    // All active projects
    prisma.project.findMany({
      where: { companyId, deletedAt: null },
      select: {
        id: true,
        name: true,
        projectNumber: true,
        status: true,
        contractAmount: true,
        startDate: true,
        endDate: true,
      },
    }),
    // Unpaid invoices for upcoming payment schedule
    prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ['発行済', '送付済', '未払い'] },
        dueDate: { gte: now },
      },
      select: {
        id: true,
        invoiceNumber: true,
        dueDate: true,
        totalAmount: true,
        project: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),
  ])

  // ── Monthly revenue & cost ────────────────────────────────────────
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const revenue = invoices
      .filter(inv => inv.invoiceDate && new Date(inv.invoiceDate).getMonth() + 1 === month)
      .reduce((s, inv) => s + inv.totalAmount, 0)
    const cost = orders
      .filter(ord => ord.orderDate && new Date(ord.orderDate).getMonth() + 1 === month)
      .reduce((s, ord) => s + ord.totalAmount, 0)
    const grossProfit = revenue - cost
    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0
    return { month, revenue, cost, grossProfit, grossMarginPct }
  })

  // ── This-month KPIs ───────────────────────────────────────────────
  const thisMonthInvoices = invoices.filter(
    inv => inv.invoiceDate &&
      new Date(inv.invoiceDate) >= startOfMonth &&
      new Date(inv.invoiceDate) < endOfMonth
  )
  const thisMonthOrders = orders.filter(
    ord => ord.orderDate &&
      new Date(ord.orderDate) >= startOfMonth &&
      new Date(ord.orderDate) < endOfMonth
  )
  const monthRevenue = thisMonthInvoices.reduce((s, i) => s + i.totalAmount, 0)
  const monthCost = thisMonthOrders.reduce((s, o) => s + o.totalAmount, 0)
  const monthGrossProfit = monthRevenue - monthCost
  const monthGrossMarginPct = monthRevenue > 0 ? (monthGrossProfit / monthRevenue) * 100 : 0

  const activeProjects = projects.filter(
    p => p.status !== '引合' && p.status !== '失注' && p.status !== '完了' && p.status !== '完工'
  )
  const activeCount = activeProjects.length

  // YTD totals
  const ytdRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0)
  const ytdCost = monthlyData.reduce((s, m) => s + m.cost, 0)
  const ytdGrossProfit = ytdRevenue - ytdCost
  const ytdGrossMarginPct = ytdRevenue > 0 ? (ytdGrossProfit / ytdRevenue) * 100 : 0

  // ── Top 5 projects by invoice revenue ────────────────────────────
  const projectRevMap: Record<string, { name: string; projectNumber: string; revenue: number }> = {}
  for (const inv of invoices) {
    if (!inv.projectId || !inv.project) continue
    if (!projectRevMap[inv.projectId]) {
      projectRevMap[inv.projectId] = {
        name: inv.project.name,
        projectNumber: inv.project.projectNumber,
        revenue: 0,
      }
    }
    projectRevMap[inv.projectId].revenue += inv.totalAmount
  }
  const top5Projects = Object.values(projectRevMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // ── Upcoming payments (next 30 days) ─────────────────────────────
  const upcomingPayments = invoicesUnpaid.map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    projectName: inv.project?.name ?? '—',
    dueDate: inv.dueDate?.toISOString().slice(0, 10) ?? '',
    amount: inv.totalAmount,
  }))

  return NextResponse.json({
    year,
    currentMonth: thisMonth + 1,
    kpi: {
      monthRevenue,
      monthCost,
      monthGrossProfit,
      monthGrossMarginPct,
      activeCount,
      ytdRevenue,
      ytdCost,
      ytdGrossProfit,
      ytdGrossMarginPct,
    },
    monthly: monthlyData,
    top5Projects,
    upcomingPayments,
  })
}
