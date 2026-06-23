import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  // Vercel Cron Jobs sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization')
  const legacySecret = req.headers.get('x-cron-secret')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const bearerValid = authHeader === `Bearer ${cronSecret}`
    const legacyValid = legacySecret === cronSecret
    if (!bearerValid && !legacyValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()

  // Calculate last month range
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  const lastMonthLabel = `${lastMonthStart.getFullYear()}年${lastMonthStart.getMonth() + 1}月`

  const companies = await prisma.company.findMany({ select: { id: true, name: true } })
  const results: Array<{ companyId: string; companyName: string; summary: Record<string, unknown> }> = []

  for (const company of companies) {
    try {
      const [newProjects, completedProjects, activeProjects, invoices, orders] = await Promise.all([
        // New projects created last month
        prisma.project.count({
          where: {
            companyId: company.id,
            createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
            deletedAt: null,
          },
        }),
        // Projects completed last month
        prisma.project.count({
          where: {
            companyId: company.id,
            status: '完了',
            updatedAt: { gte: lastMonthStart, lte: lastMonthEnd },
            deletedAt: null,
          },
        }),
        // Currently active projects (point-in-time)
        prisma.project.count({
          where: {
            companyId: company.id,
            status: { notIn: ['完了', '失注', 'キャンセル'] },
            deletedAt: null,
          },
        }),
        // Invoices issued last month
        prisma.invoice.findMany({
          where: {
            companyId: company.id,
            invoiceDate: { gte: lastMonthStart, lte: lastMonthEnd },
          },
          select: { totalAmount: true, status: true },
        }),
        // Orders placed last month
        prisma.order.findMany({
          where: {
            companyId: company.id,
            orderDate: { gte: lastMonthStart, lte: lastMonthEnd },
          },
          select: { totalAmount: true },
        }),
      ])

      const invoiceTotal = invoices.reduce((s, i) => s + i.totalAmount, 0)
      const paidTotal = invoices
        .filter((i) => i.status === '入金済')
        .reduce((s, i) => s + i.totalAmount, 0)
      const orderTotal = orders.reduce((s, o) => s + o.totalAmount, 0)
      const grossProfit = invoiceTotal - orderTotal

      const summary = {
        period: lastMonthLabel,
        projects: { new: newProjects, completed: completedProjects, active: activeProjects },
        sales: {
          invoiceTotal,
          paidTotal,
          unpaidTotal: invoiceTotal - paidTotal,
        },
        orders: { orderTotal },
        grossProfit,
      }

      const reportContent = [
        `${lastMonthLabel}度 月次決算レポート`,
        ``,
        `【案件】`,
        `  新規: ${newProjects}件 / 完了: ${completedProjects}件 / 進行中: ${activeProjects}件`,
        ``,
        `【売上（請求）】`,
        `  請求合計: ¥${invoiceTotal.toLocaleString('ja-JP')}`,
        `  入金済: ¥${paidTotal.toLocaleString('ja-JP')}`,
        `  未入金: ¥${(invoiceTotal - paidTotal).toLocaleString('ja-JP')}`,
        ``,
        `【発注】`,
        `  発注合計: ¥${orderTotal.toLocaleString('ja-JP')}`,
        ``,
        `【粗利】`,
        `  ¥${grossProfit.toLocaleString('ja-JP')}（請求合計 - 発注合計）`,
      ].join('\n')

      // Notify admin users
      const admins = await prisma.user.findMany({
        where: {
          companyId: company.id,
          role: { in: ['管理者', 'マネージャー', 'admin', 'manager'] },
        },
        select: { id: true },
      })

      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            title: `${lastMonthLabel}度 月次決算レポート`,
            content: reportContent,
            type: 'info',
            link: '/reports/profit-loss',
          })),
        })
      }

      results.push({ companyId: company.id, companyName: company.name, summary })
    } catch (e) {
      results.push({
        companyId: company.id,
        companyName: company.name,
        summary: { error: String(e) },
      })
    }
  }

  return NextResponse.json({
    ok: true,
    ran: now.toISOString(),
    period: lastMonthLabel,
    companiesProcessed: results.length,
    results,
  })
}
