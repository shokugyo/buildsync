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

  const [invoices, company] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId },
      include: { project: true, customer: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
  ])

  const header = ['請求番号', '案件名', '請求先', '請求元', '請求日', '支払期限', '税抜金額', '消費税額', '税込金額', '入金日', 'ステータス']
  const rows = invoices.map(i => [
    i.invoiceNumber,
    i.project?.name ?? '',
    i.customer?.name ?? '',
    company?.name ?? '',
    i.invoiceDate ? new Date(i.invoiceDate).toLocaleDateString('ja-JP') : '',
    i.dueDate ? new Date(i.dueDate).toLocaleDateString('ja-JP') : '',
    String(i.amount),
    String(i.taxAmount),
    String(i.totalAmount),
    i.paidDate ? new Date(i.paidDate).toLocaleDateString('ja-JP') : '',
    i.status,
  ])

  const bom = '\uFEFF'
  const csv = bom + toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="invoices_${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
