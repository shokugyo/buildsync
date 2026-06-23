import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId') || undefined

  const reports = await prisma.workReport.findMany({
    where: {
      companyId,
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { name: true, projectNumber: true } },
      reporter: { select: { name: true } },
    },
    orderBy: { reportDate: 'desc' },
  })

  const data = [
    ['案件番号', '案件名', '報告者', '報告日', '現場', '作業内容'],
    ...reports.map(r => [
      r.project.projectNumber,
      r.project.name,
      r.reporter.name,
      new Date(r.reportDate).toLocaleDateString('ja-JP'),
      r.location ?? '',
      r.content,
    ])
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, '作業報告一覧')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="work-reports_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
