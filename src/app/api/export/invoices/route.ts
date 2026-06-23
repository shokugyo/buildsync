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

  const invoices = await prisma.invoice.findMany({
    where: { companyId },
    include: { project: true, customer: true },
    orderBy: { createdAt: 'desc' },
  })

  // 税込金額から逆算: 税抜 = totalAmount / 1.1, 消費税 = totalAmount / 1.1 * 0.1
  // 入金日フィールド名: paidDate（schema確認済み）
  const header = [
    '請求番号',
    '案件名',
    '案件番号',
    '請求先',
    '請求日',
    '支払期限',
    '税抜金額',
    '消費税額',
    '税込金額',
    'ステータス',
    '入金日',
    '登録日時',
  ]

  const rows = invoices.map(i => {
    const taxExcluded = Math.round(i.totalAmount / 1.1)
    const taxAmount = i.totalAmount - taxExcluded
    return [
      i.invoiceNumber,
      i.project?.name ?? '',
      i.project?.projectNumber ?? '',
      i.customer?.name ?? '',
      formatDate(i.invoiceDate),
      formatDate(i.dueDate),
      String(taxExcluded),
      String(taxAmount),
      String(i.totalAmount),
      i.status,
      formatDate(i.paidDate),
      formatDate(i.createdAt),
    ]
  })

  const bom = '\uFEFF'
  const csv = bom + toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="invoices_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
