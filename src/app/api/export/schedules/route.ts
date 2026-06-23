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

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId') || undefined

  const schedules = await prisma.schedule.findMany({
    where: {
      project: { companyId },
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { name: true, projectNumber: true } },
      assignee: { select: { name: true } },
    },
    orderBy: [{ projectId: 'asc' }, { startDate: 'asc' }],
  })

  const header = ['案件番号', '案件名', '工程名', '工種', '開始予定日', '終了予定日', '実開始日', '実終了日', '担当者', '進捗率', 'ステータス', '備考']
  const rows = schedules.map(s => [
    s.project.projectNumber,
    s.project.name,
    s.name,
    s.category ?? '',
    new Date(s.startDate).toLocaleDateString('ja-JP'),
    new Date(s.endDate).toLocaleDateString('ja-JP'),
    s.actualStart ? new Date(s.actualStart).toLocaleDateString('ja-JP') : '',
    s.actualEnd ? new Date(s.actualEnd).toLocaleDateString('ja-JP') : '',
    s.assignee?.name ?? '',
    String(s.progress),
    s.status,
    s.notes ?? '',
  ])

  const csv = toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="schedules_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
