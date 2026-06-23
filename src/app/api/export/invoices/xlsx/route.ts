import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const [invoices, company] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId },
      include: {
        project: { select: { name: true, projectNumber: true } },
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
  ])

  const data = [
    ['請求番号', '案件番号', '案件名', '請求先', '請求元', '請求日', '支払期限', '入金日', 'ステータス', '税抜金額', '消費税', '税込合計'],
    ...invoices.map(i => [
      i.invoiceNumber,
      i.project.projectNumber,
      i.project.name,
      i.customer?.name ?? '',
      company?.name ?? '',
      i.invoiceDate ? new Date(i.invoiceDate).toLocaleDateString('ja-JP') : '',
      i.dueDate ? new Date(i.dueDate).toLocaleDateString('ja-JP') : '',
      i.paidDate ? new Date(i.paidDate).toLocaleDateString('ja-JP') : '',
      i.status,
      i.amount,
      i.taxAmount,
      i.totalAmount,
    ])
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, '請求一覧')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="invoices_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
