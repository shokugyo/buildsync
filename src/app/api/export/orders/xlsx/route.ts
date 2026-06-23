import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const orders = await prisma.order.findMany({
    where: { companyId },
    include: {
      project: { select: { name: true, projectNumber: true } },
      supplier: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = [
    ['発注番号', '案件番号', '案件名', '業者名', '件名', '工種', '発注日', '納期', '税抜金額', '消費税', '税込合計', 'ステータス'],
    ...orders.map(o => [
      o.orderNumber,
      o.project.projectNumber,
      o.project.name,
      o.supplier?.name ?? '',
      o.subject,
      o.workType ?? '',
      o.orderDate ? new Date(o.orderDate).toLocaleDateString('ja-JP') : '',
      o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('ja-JP') : '',
      o.amount,
      o.taxAmount,
      o.totalAmount,
      o.status,
    ])
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, '発注一覧')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="orders_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
