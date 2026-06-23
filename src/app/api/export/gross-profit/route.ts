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

  const projects = await prisma.project.findMany({
    where: { companyId, deletedAt: null },
    include: {
      customer: true,
      orders: { select: { totalAmount: true, status: true } },
      invoices: {
        select: { totalAmount: true, status: true, payments: { select: { amount: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // RP-013: 粗利管理表
  const header = [
    '案件番号', '案件名', '顧客名', 'ステータス',
    '契約金額', '実行予算', '発注済合計', '請求済金額', '支払済金額',
    '粗利見込', '粗利率',
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
    const grossProfit = contractAmount - orderedAmount
    const grossProfitRate = contractAmount > 0
      ? (grossProfit / contractAmount * 100).toFixed(1) + '%'
      : ''

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
      String(grossProfit),
      grossProfitRate,
    ]
  })

  const bom = '\uFEFF'
  const csv = bom + toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gross-profit_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
