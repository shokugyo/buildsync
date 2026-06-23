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

  const estimates = await prisma.estimate.findMany({
    where: { companyId },
    include: {
      project: { select: { name: true, projectNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const header = ['見積番号', '案件番号', '案件名', '見積日', '有効期限', 'ステータス', '税抜金額', '消費税', '税込合計']
  const rows = estimates.map(e => [
    e.estimateNumber,
    e.project.projectNumber,
    e.project.name,
    e.estimateDate ? new Date(e.estimateDate).toLocaleDateString('ja-JP') : '',
    e.validUntil ? new Date(e.validUntil).toLocaleDateString('ja-JP') : '',
    e.status,
    String(e.amount),
    String(e.taxAmount),
    String(e.totalAmount),
  ])

  const csv = toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="estimates_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
