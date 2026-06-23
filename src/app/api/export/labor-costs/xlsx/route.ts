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
  const month = searchParams.get('month')

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
  })

  const users = await prisma.user.findMany({
    where: { companyId },
    select: { id: true, name: true, hourlyRate: true },
  })

  const userMap = new Map(users.map((u) => [u.name, u]))

  const grouped = new Map<string, { workerName: string; workDays: Set<string>; totalHours: number; hourlyRate: number }>()

  for (const a of attendances) {
    const key = a.workerName
    if (!grouped.has(key)) {
      const user = userMap.get(a.workerName)
      grouped.set(key, {
        workerName: a.workerName,
        workDays: new Set(),
        totalHours: 0,
        hourlyRate: user?.hourlyRate ?? 2000,
      })
    }
    const entry = grouped.get(key)!
    const dateStr = a.workDate.toISOString().slice(0, 10)
    entry.workDays.add(dateStr)
    entry.totalHours += a.workingHours ?? 0
  }

  const rows = Array.from(grouped.values()).map((entry) => {
    const totalHours = Math.round(entry.totalHours * 100) / 100
    return {
      workerName: entry.workerName,
      workDays: entry.workDays.size,
      totalHours,
      hourlyRate: entry.hourlyRate,
      totalCost: Math.round(totalHours * entry.hourlyRate),
    }
  })

  const totalCost = rows.reduce((acc, r) => acc + r.totalCost, 0)

  const sheetData: (string | number)[][] = [
    ['氏名', '勤務日数', '総労働時間', '時給(円)', '労務費(円)'],
    ...rows.map((r) => [r.workerName, r.workDays, r.totalHours, r.hourlyRate, r.totalCost]),
    ['合計', '', '', '', totalCost],
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(sheetData)
  ws['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, ws, '労務費')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="labor-costs_${month}.xlsx"`,
    },
  })
}
