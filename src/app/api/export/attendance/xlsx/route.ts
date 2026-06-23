import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土']

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // YYYY-MM (required)
  const projectId = searchParams.get('projectId') || undefined

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month パラメータ (YYYY-MM) が必要です' }, { status: 400 })
  }

  const [y, m] = month.split('-').map(Number)
  const dateFrom = new Date(y, m - 1, 1)
  const dateTo = new Date(y, m, 0, 23, 59, 59)

  const attendances = await prisma.workerAttendance.findMany({
    where: {
      companyId,
      workDate: { gte: dateFrom, lte: dateTo },
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { name: true, projectNumber: true } },
    },
    orderBy: [{ workerName: 'asc' }, { workDate: 'asc' }],
  })

  // ---- Sheet 1: 月次集計 ----
  // Group by workerName
  interface WorkerSummary {
    workerName: string
    company: string
    days: Set<string>
    totalWorkingHours: number
    totalOvertimeHours: number
  }

  const workerMap = new Map<string, WorkerSummary>()
  for (const a of attendances) {
    const key = `${a.workerName}__${a.company ?? ''}`
    if (!workerMap.has(key)) {
      workerMap.set(key, {
        workerName: a.workerName,
        company: a.company ?? '',
        days: new Set(),
        totalWorkingHours: 0,
        totalOvertimeHours: 0,
      })
    }
    const w = workerMap.get(key)!
    const dateStr = a.workDate.toISOString().slice(0, 10)
    w.days.add(dateStr)
    w.totalWorkingHours += a.workingHours ?? 0
    w.totalOvertimeHours += a.overtimeHours ?? 0
  }

  const summaryRows = Array.from(workerMap.values())
  const sheet1Data: (string | number)[][] = [
    ['作業員名', '所属会社', '出勤日数', '総労働時間', '残業時間'],
    ...summaryRows.map(w => [
      w.workerName,
      w.company,
      w.days.size,
      Math.round(w.totalWorkingHours * 100) / 100,
      Math.round(w.totalOvertimeHours * 100) / 100,
    ]),
    // Total row
    [
      '合計',
      '',
      summaryRows.reduce((acc, w) => acc + w.days.size, 0),
      Math.round(summaryRows.reduce((acc, w) => acc + w.totalWorkingHours, 0) * 100) / 100,
      Math.round(summaryRows.reduce((acc, w) => acc + w.totalOvertimeHours, 0) * 100) / 100,
    ],
  ]

  // ---- Sheet 2: 日別明細 ----
  const sheet2Data: (string | number)[][] = [
    ['日付', '曜日', '作業員名', '所属会社', 'チェックイン', 'チェックアウト', '労働時間', '残業時間', '作業内容'],
    ...attendances.map(a => {
      const d = new Date(a.workDate)
      const dow = WEEKDAYS_JA[d.getDay()]
      return [
        d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        dow,
        a.workerName,
        a.company ?? '',
        a.entryTime ?? '',
        a.exitTime ?? '',
        a.workingHours != null ? a.workingHours : '',
        a.overtimeHours != null ? a.overtimeHours : '',
        a.workContent ?? '',
      ]
    }),
  ]

  // Build workbook
  const wb = XLSX.utils.book_new()

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data)
  // Style header row width
  ws1['!cols'] = [
    { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
  ]
  XLSX.utils.book_append_sheet(wb, ws1, '月次集計')

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data)
  ws2['!cols'] = [
    { wch: 14 }, { wch: 4 }, { wch: 16 }, { wch: 16 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 24 },
  ]
  XLSX.utils.book_append_sheet(wb, ws2, '日別明細')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="attendance_${month}.xlsx"`,
    },
  })
}
