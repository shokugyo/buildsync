import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const format = searchParams.get('format') || 'yayoi' // 'yayoi' | 'freee'

  // 発注データを取得（支払済み）
  const orders = await prisma.order.findMany({
    where: {
      companyId,
      status: { in: ['完了', '発注済'] },
      ...(from || to ? {
        orderDate: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        }
      } : {})
    },
    include: {
      supplier: { select: { name: true } },
      project: { select: { name: true, projectNumber: true } },
    }
  })

  // 請求データを取得
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: { in: ['入金済', '送付済'] },
      ...(from || to ? {
        invoiceDate: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        }
      } : {})
    },
    include: {
      customer: { select: { name: true } },
      project: { select: { name: true, projectNumber: true } },
    }
  })

  // 弥生会計形式のCSV生成
  const rows: string[] = []

  if (format === 'yayoi') {
    rows.push('伝票日付,伝票番号,借方科目,借方金額,貸方科目,貸方金額,摘要,案件コード')

    for (const order of orders) {
      const date = order.orderDate ? new Date(order.orderDate).toLocaleDateString('ja-JP') : ''
      rows.push([
        date,
        order.orderNumber,
        '外注費',
        order.totalAmount.toString(),
        '未払金',
        order.totalAmount.toString(),
        `${order.subject} (${order.supplier?.name || ''})`,
        order.project.projectNumber,
      ].join(','))
    }

    for (const inv of invoices) {
      const date = inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('ja-JP') : ''
      rows.push([
        date,
        inv.invoiceNumber,
        '売掛金',
        inv.totalAmount.toString(),
        '売上高',
        inv.totalAmount.toString(),
        `${inv.invoiceNumber} (${inv.customer?.name || ''})`,
        inv.project.projectNumber,
      ].join(','))
    }
  } else {
    // freee形式
    rows.push('取引日,取引先,勘定科目,税区分,金額,備考')
    for (const order of orders) {
      const date = order.orderDate ? new Date(order.orderDate).toLocaleDateString('ja-JP') : ''
      rows.push([date, order.supplier?.name || '', '外注費', '課税仕入10%', order.amount.toString(), order.subject].join(','))
    }
    for (const inv of invoices) {
      const date = inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('ja-JP') : ''
      rows.push([date, inv.customer?.name || '', '売上高', '課税売上10%', inv.amount.toString(), inv.invoiceNumber].join(','))
    }
  }

  const csv = rows.join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="accounting_${new Date().toISOString().split('T')[0]}.csv"`,
    }
  })
}
