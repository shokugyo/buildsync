import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

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

  const data = [
    ['見積番号', '案件番号', '案件名', '見積日', '有効期限', 'ステータス', '税抜金額', '消費税', '税込合計'],
    ...estimates.map(e => [
      e.estimateNumber,
      e.project.projectNumber,
      e.project.name,
      e.estimateDate ? new Date(e.estimateDate).toLocaleDateString('ja-JP') : '',
      e.validUntil ? new Date(e.validUntil).toLocaleDateString('ja-JP') : '',
      e.status,
      e.amount,
      e.taxAmount,
      e.totalAmount,
    ])
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, '見積一覧')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="estimates_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
