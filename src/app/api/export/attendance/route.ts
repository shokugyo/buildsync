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

  const attendances = await prisma.workerAttendance.findMany({
    where: { companyId },
    include: { project: true },
    orderBy: { workDate: 'desc' },
  })

  const header = ['案件番号', '案件名', '作業員名', '所属会社', '作業日', '入場時刻', '退場時刻', '作業内容']
  const rows = attendances.map(a => [
    a.project.projectNumber,
    a.project.name,
    a.workerName,
    a.company ?? '',
    a.workDate ? new Date(a.workDate).toLocaleDateString('ja-JP') : '',
    a.entryTime ?? '',
    a.exitTime ?? '',
    a.workContent ?? '',
  ])

  const csv = toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="attendance_${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
