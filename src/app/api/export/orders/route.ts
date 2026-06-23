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

  const orders = await prisma.order.findMany({
    where: { companyId },
    include: { project: true, supplier: true },
    orderBy: { createdAt: 'desc' },
  })

  const header = ['発注番号', '案件名', '発注先', '件名', '工種', '発注日', '納期', '支払条件', '税抜金額', '消費税額', '税込金額', 'ステータス']
  const rows = orders.map(o => [
    o.orderNumber,
    o.project?.name ?? '',
    o.supplier?.name ?? '',
    o.subject,
    o.workType ?? '',
    o.orderDate ? new Date(o.orderDate).toLocaleDateString('ja-JP') : '',
    o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('ja-JP') : '',
    o.paymentTerms ?? '',
    String(o.amount),
    String(o.taxAmount),
    String(o.totalAmount),
    o.status,
  ])

  const bom = '\uFEFF'
  const csv = bom + toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders_${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
