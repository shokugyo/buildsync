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

  const fmtDate = (d: Date | null | undefined) =>
    d ? new Date(d).toISOString().slice(0, 10) : ''

  const header = ['案件番号', '案件名', '顧客名', '現場住所', '工事種別', 'ステータス', '担当者名', '着工予定日', '完工予定日', '引渡予定日', '契約金額', '実行予算', '登録日時']
  const rows = projects.map(p => [
    p.projectNumber,
    p.name,
    p.customer?.name ?? '',
    p.address ?? '',
    p.workType ?? '',
    p.status,
    p.manager?.name ?? '',
    fmtDate(p.startDate),
    fmtDate(p.endDate),
    fmtDate(p.deliveryDate),
    String(p.contractAmount ?? ''),
    String(p.estimatedCost ?? ''),
    fmtDate(p.createdAt),
  ])

  const bom = '\uFEFF'
  const csv = bom + toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="projects_${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
