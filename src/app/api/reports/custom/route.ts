import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const METRIC_LABELS: Record<string, string> = {
  projects_total: '総案件数',
  projects_in_progress: '進行中案件数',
  revenue_total: '売上合計',
  cost_total: '原価合計',
  gross_profit_rate: '粗利率（%）',
  invoices_unpaid: '未払い請求額',
  orders_pending: '未完了発注数',
  defects_open: '未対応指摘数',
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) {
    return NextResponse.json({ error: '会社情報が取得できません' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const metricsParam = searchParams.getAll('metrics[]')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const fromDate = from ? new Date(from) : undefined
  const toDate = to ? new Date(to) : undefined
  const dateRange = fromDate && toDate
    ? { gte: fromDate, lte: toDate }
    : fromDate
    ? { gte: fromDate }
    : toDate
    ? { lte: toDate }
    : undefined

  const requestedMetrics = metricsParam.length > 0
    ? metricsParam
    : Object.keys(METRIC_LABELS)

  try {
    // Collect all metric promises
    const metricPromises: Record<string, Promise<number>> = {}

    if (requestedMetrics.includes('projects_total')) {
      metricPromises['projects_total'] = prisma.project.count({
        where: {
          companyId,
          deletedAt: null,
          ...(dateRange ? { createdAt: dateRange } : {}),
        },
      })
    }

    if (requestedMetrics.includes('projects_in_progress')) {
      metricPromises['projects_in_progress'] = prisma.project.count({
        where: {
          companyId,
          deletedAt: null,
          status: { in: ['施工中', '工事中', '着工'] },
        },
      })
    }

    if (requestedMetrics.includes('revenue_total') || requestedMetrics.includes('gross_profit_rate')) {
      metricPromises['_revenue_raw'] = prisma.invoice.aggregate({
        where: {
          companyId,
          ...(dateRange ? { invoiceDate: dateRange } : {}),
        },
        _sum: { totalAmount: true },
      }).then(r => r._sum.totalAmount ?? 0)
    }

    if (requestedMetrics.includes('cost_total') || requestedMetrics.includes('gross_profit_rate')) {
      metricPromises['_cost_raw'] = prisma.order.aggregate({
        where: {
          companyId,
          ...(dateRange ? { orderDate: dateRange } : {}),
        },
        _sum: { totalAmount: true },
      }).then(r => r._sum.totalAmount ?? 0)
    }

    if (requestedMetrics.includes('invoices_unpaid')) {
      metricPromises['invoices_unpaid'] = prisma.invoice.aggregate({
        where: {
          companyId,
          status: { notIn: ['支払済', '完了'] },
          ...(dateRange ? { invoiceDate: dateRange } : {}),
        },
        _sum: { totalAmount: true },
      }).then(r => r._sum.totalAmount ?? 0)
    }

    if (requestedMetrics.includes('orders_pending')) {
      metricPromises['orders_pending'] = prisma.order.count({
        where: {
          companyId,
          status: { notIn: ['完了', '納品済', 'キャンセル'] },
        },
      })
    }

    if (requestedMetrics.includes('defects_open')) {
      metricPromises['defects_open'] = prisma.defect.count({
        where: {
          status: { notIn: ['是正完了', '完了', 'クローズ'] },
          project: { companyId },
        },
      })
    }

    // Resolve all
    const keys = Object.keys(metricPromises)
    const values = await Promise.all(keys.map(k => metricPromises[k]))
    const resolved: Record<string, number> = {}
    keys.forEach((k, i) => { resolved[k] = values[i] })

    // Build result
    const result: Record<string, { value: number; label: string }> = {}

    for (const id of requestedMetrics) {
      if (id === 'revenue_total') {
        result[id] = { value: Math.round(resolved['_revenue_raw'] ?? 0), label: METRIC_LABELS[id] }
      } else if (id === 'cost_total') {
        result[id] = { value: Math.round(resolved['_cost_raw'] ?? 0), label: METRIC_LABELS[id] }
      } else if (id === 'gross_profit_rate') {
        const rev = resolved['_revenue_raw'] ?? 0
        const cost = resolved['_cost_raw'] ?? 0
        const rate = rev > 0 ? ((rev - cost) / rev) * 100 : 0
        result[id] = { value: Math.round(rate * 10) / 10, label: METRIC_LABELS[id] }
      } else if (resolved[id] !== undefined) {
        result[id] = { value: resolved[id], label: METRIC_LABELS[id] ?? id }
      }
    }

    return NextResponse.json({
      metrics: result,
      period: { from: from ?? null, to: to ?? null },
    })
  } catch (err) {
    console.error('Custom report error:', err)
    return NextResponse.json({ error: 'レポート生成に失敗しました' }, { status: 500 })
  }
}
