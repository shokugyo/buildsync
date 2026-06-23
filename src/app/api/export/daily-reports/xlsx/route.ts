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

  const reports = await prisma.dailyReport.findMany({
    where: {
      project: { companyId },
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { name: true, projectNumber: true } },
      reporter: { select: { name: true } },
    },
    orderBy: { workDate: 'desc' },
  })

  const data = [
    ['案件番号', '案件名', '報告者', '作業日', '天気', '作業内容', '作業員数', '進捗', '課題・問題', '翌日予定'],
    ...reports.map(r => [
      r.project.projectNumber,
      r.project.name,
      r.reporter.name,
      new Date(r.workDate).toLocaleDateString('ja-JP'),
      r.weather ?? '',
      r.content,
      r.workers ?? '',
      r.progress ?? '',
      r.issues ?? '',
      r.nextPlan ?? '',
    ])
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, '日報一覧')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="daily-reports_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
