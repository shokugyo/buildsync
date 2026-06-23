import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function toCsv(rows: string[][]): string {
  return rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return ''
  const date = new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const orders = await prisma.order.findMany({
    where: { companyId },
    include: {
      project: true,
      supplier: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // 発注担当者: confirmedBy（担当者名文字列）、なければ空
  // 税込金額から逆算: 税抜 = totalAmount / 1.1, 消費税 = totalAmount / 1.1 * 0.1
  const header = [
    '発注番号',
    '案件名',
    '案件番号',
    '発注先',
    '工種',
    '発注日',
    '納期',
    '税抜金額',
    '消費税額',
    '税込金額',
    'ステータス',
    '担当者名',
    '登録日時',
  ]

  const rows = orders.map(o => {
    const taxExcluded = Math.round(o.totalAmount / 1.1)
    const taxAmount = o.totalAmount - taxExcluded
    return [
      o.orderNumber,
      o.project?.name ?? '',
      o.project?.projectNumber ?? '',
      o.supplier?.name ?? '',
      o.workType ?? '',
      formatDate(o.orderDate),
      formatDate(o.deliveryDate),
      String(taxExcluded),
      String(taxAmount),
      String(o.totalAmount),
      o.status,
      o.confirmedBy ?? '',
      formatDate(o.createdAt),
    ]
  })

  const bom = '\uFEFF'
  const csv = bom + toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
