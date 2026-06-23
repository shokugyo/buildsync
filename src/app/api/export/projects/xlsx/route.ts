import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const projects = await prisma.project.findMany({
    where: { companyId, deletedAt: null },
    include: {
      customer: { select: { name: true } },
      manager: { select: { name: true } },
      sales: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = [
    ['案件番号', '案件名', 'ステータス', '顧客名', '工種', '着工日', '完工予定日', '契約金額', '予定原価', '粗利予定', '現場住所', '営業担当', '現場監督', '登録日'],
    ...projects.map(p => {
      const contract = p.contractAmount ?? 0
      const cost = p.estimatedCost ?? 0
      const grossProfit = contract > 0 || cost > 0 ? contract - cost : ''
      return [
        p.projectNumber,
        p.name,
        p.status,
        p.customer?.name ?? '',
        p.workType ?? '',
        p.startDate ? new Date(p.startDate).toLocaleDateString('ja-JP') : '',
        p.endDate ? new Date(p.endDate).toLocaleDateString('ja-JP') : '',
        p.contractAmount ?? '',
        p.estimatedCost ?? '',
        grossProfit,
        p.address ?? '',
        (p as any).sales?.name ?? '',
        p.manager?.name ?? '',
        new Date(p.createdAt).toLocaleDateString('ja-JP'),
      ]
    })
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, '案件一覧')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="projects_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
