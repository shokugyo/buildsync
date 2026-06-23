import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function toCsv(rows: string[][]): string {
  return rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
}

/** entryTime/exitTime は "HH:MM" 形式文字列なので workDate と合成して表示 */
function combineDateTime(workDate: Date, timeStr: string | null | undefined): string {
  if (!timeStr) return ''
  const d = new Date(workDate)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day} ${timeStr}`
}

/** checkInMethod: "manual" → "手動", それ以外は "QR" */
function formatMethod(method: string | null | undefined): string {
  if (!method) return ''
  return method === 'manual' ? '手動' : 'QR'
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: {
    companyId: string
    projectId?: string
    workDate?: { gte?: Date; lte?: Date }
  } = { companyId }

  if (projectId) where.projectId = projectId
  if (from || to) {
    where.workDate = {}
    if (from) where.workDate.gte = new Date(from)
    if (to) where.workDate.lte = new Date(to)
  }

  const attendances = await prisma.workerAttendance.findMany({
    where,
    include: { project: true },
    orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
  })

  // RP-014 設計書指定列
  // WorkerAttendance に職種（jobType）フィールドなし → 空文字
  const header = [
    '案件番号',
    '案件名',
    '現場住所',
    '作業員氏名',
    '所属会社',
    '職種',
    '入場日時',
    '退場日時',
    '勤務時間(h)',
    '入場方法',
  ]

  const rows = attendances.map(a => {
    // workingHours フィールドが設定済みであればそれを優先（小数点1桁）
    let workingHoursStr = ''
    if (a.workingHours != null) {
      workingHoursStr = a.workingHours.toFixed(1)
    }
    return [
      a.project.projectNumber,
      a.project.name,
      a.project.address ?? '',
      a.workerName,
      a.company ?? '',
      '', // 職種: WorkerAttendance モデルに職種フィールドなし
      combineDateTime(a.workDate, a.entryTime),
      combineDateTime(a.workDate, a.exitTime),
      workingHoursStr,
      formatMethod(a.checkInMethod),
    ]
  })

  const bom = '\uFEFF'
  const csv = bom + toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="attendance_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
