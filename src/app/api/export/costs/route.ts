import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function toCsv(rows: string[][]): string {
  return rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') || 'summary'

  if (mode === 'detail') {
    // Budget line items export
    const budgets = await prisma.budget.findMany({
      where: { project: { companyId } },
      include: { project: { include: { customer: true } } },
      orderBy: { project: { projectNumber: 'asc' } },
    })
    const header = ['案件番号', '案件名', '顧客名', '費目', '説明', '予算額']
    const rows = budgets.map(b => [
      b.project.projectNumber,
      b.project.name,
      b.project.customer?.name ?? '',
      b.category,
      b.description ?? '',
      String(b.amount),
    ])
    const bom = '\uFEFF'
    const csv = bom + toCsv([header, ...rows])
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="costs_detail_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  // RP-012: 原価管理表 - project-level cost summary
  const projects = await prisma.project.findMany({
    where: { companyId, deletedAt: null },
    include: {
      customer: true,
      orders: { select: { totalAmount: true, status: true } },
      invoices: {
        select: { totalAmount: true, status: true, payments: { select: { amount: true } } },
      },
      budgets: { select: { amount: true } },
    },
    orderBy: { projectNumber: 'asc' },
  })

  const header = [
    '案件番号', '案件名', '顧客名', 'ステータス',
    '契約金額', '実行予算', '発注済金額', '請求済金額', '支払済金額',
    '原価見込', '粗利見込', '粗利率', '予算残',
  ]

  const rows = projects.map(p => {
    const contractAmount = p.contractAmount ?? 0
    const estimatedCost = p.estimatedCost ?? 0
    const orderedAmount = p.orders
      .filter(o => !['下書き', '取消'].includes(o.status))
      .reduce((s, o) => s + o.totalAmount, 0)
    const invoicedAmount = p.invoices
      .filter(i => !['未作成', '差戻し', '取消'].includes(i.status))
      .reduce((s, i) => s + i.totalAmount, 0)
    const paidAmount = p.invoices
      .flatMap(i => i.payments)
      .reduce((s, pay) => s + pay.amount, 0)
    const estimatedGrossProfit = contractAmount - orderedAmount
    const grossProfitRate = contractAmount > 0
      ? (estimatedGrossProfit / contractAmount * 100).toFixed(1) + '%'
      : ''
    const budgetRemaining = estimatedCost - orderedAmount

    return [
      p.projectNumber,
      p.name,
      p.customer?.name ?? '',
      p.status,
      String(contractAmount || ''),
      String(estimatedCost || ''),
      String(orderedAmount),
      String(invoicedAmount),
      String(paidAmount),
      String(orderedAmount),
      String(estimatedGrossProfit),
      grossProfitRate,
      String(budgetRemaining),
    ]
  })

  const bom = '\uFEFF'
  const csv = bom + toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="costs_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
