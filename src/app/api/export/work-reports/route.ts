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

  const reports = await prisma.workReport.findMany({
    where: { companyId },
    include: {
      project: { select: { name: true, projectNumber: true } },
      reporter: { select: { name: true } },
    },
    orderBy: { reportDate: 'desc' },
  })

  const header = ['案件番号', '案件名', '報告者', '報告日', '現場', '作業内容']
  const rows = reports.map(r => [
    r.project.projectNumber,
    r.project.name,
    r.reporter.name,
    new Date(r.reportDate).toLocaleDateString('ja-JP'),
    r.location ?? '',
    r.content,
  ])

  const csv = toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="work-reports_${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
