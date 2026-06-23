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

  const projects = await prisma.project.findMany({
    where: { companyId },
    include: { customer: true, manager: true, sales: true },
    orderBy: { createdAt: 'desc' },
  })

  const header = ['案件番号', '案件名', '顧客名', '現場住所', 'ステータス', '営業担当', '現場監督', '着工予定日', '完工予定日', '契約金額', '予定原価', '粗利予定']
  const rows = projects.map(p => {
    const contract = p.contractAmount ?? 0
    const cost = p.estimatedCost ?? 0
    const grossProfit = contract > 0 || cost > 0 ? contract - cost : ''
    return [
      p.projectNumber, p.name, p.customer?.name ?? '', p.address ?? '', p.status,
      p.sales?.name ?? '', p.manager?.name ?? '',
      p.startDate ? new Date(p.startDate).toLocaleDateString('ja-JP') : '',
      p.endDate ? new Date(p.endDate).toLocaleDateString('ja-JP') : '',
      String(p.contractAmount ?? ''), String(p.estimatedCost ?? ''), String(grossProfit),
    ]
  })

  const bom = '\uFEFF'
  const csv = bom + toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="projects_${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
