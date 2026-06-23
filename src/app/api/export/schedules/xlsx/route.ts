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

  const schedules = await prisma.schedule.findMany({
    where: {
      project: { companyId },
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      assignee: { select: { name: true } },
    },
    orderBy: [{ projectId: 'asc' }, { startDate: 'asc' }],
  })

  const detailData = [
    ['工程名', '案件名', 'カテゴリ', '担当者', '開始日', '終了日', '進捗%', 'ステータス'],
    ...schedules.map(s => [
      s.name,
      `${s.project.projectNumber} - ${s.project.name}`,
      s.category ?? '',
      s.assignee?.name ?? '',
      new Date(s.startDate).toLocaleDateString('ja-JP'),
      new Date(s.endDate).toLocaleDateString('ja-JP'),
      s.progress,
      s.status,
    ])
  ]

  // Build project-level summary
  const projectMap = new Map<string, {
    projectNumber: string
    name: string
    total: number
    done: number
    inProgress: number
    delayed: number
    notStarted: number
    avgProgress: number
    totalProgress: number
  }>()

  for (const s of schedules) {
    const key = s.project.id
    if (!projectMap.has(key)) {
      projectMap.set(key, {
        projectNumber: s.project.projectNumber,
        name: s.project.name,
        total: 0,
        done: 0,
        inProgress: 0,
        delayed: 0,
        notStarted: 0,
        avgProgress: 0,
        totalProgress: 0,
      })
    }
    const entry = projectMap.get(key)!
    entry.total++
    entry.totalProgress += s.progress
    if (s.status === '完了') entry.done++
    else if (s.status === '進行中') entry.inProgress++
    else if (s.status === '遅延') entry.delayed++
    else entry.notStarted++
  }

  const summaryData = [
    ['案件番号', '案件名', '工程数', '完了', '進行中', '遅延', '未着手', '平均進捗%'],
    ...Array.from(projectMap.values()).map(p => [
      p.projectNumber,
      p.name,
      p.total,
      p.done,
      p.inProgress,
      p.delayed,
      p.notStarted,
      p.total > 0 ? Math.round(p.totalProgress / p.total) : 0,
    ])
  ]

  const wb = XLSX.utils.book_new()

  const wsDetail = XLSX.utils.aoa_to_sheet(detailData)
  wsDetail['!cols'] = [
    { wch: 24 }, { wch: 28 }, { wch: 14 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 8 },
  ]
  XLSX.utils.book_append_sheet(wb, wsDetail, '工程一覧')

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  wsSummary['!cols'] = [
    { wch: 12 }, { wch: 28 }, { wch: 8 }, { wch: 6 },
    { wch: 8 }, { wch: 6 }, { wch: 8 }, { wch: 10 },
  ]
  XLSX.utils.book_append_sheet(wb, wsSummary, '案件別サマリー')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="schedules_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
