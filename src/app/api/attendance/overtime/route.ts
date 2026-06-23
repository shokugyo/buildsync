import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function parseTimeToHours(timeStr: string | null): number | null {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  if (isNaN(h)) return null
  return h + (m || 0) / 60
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month パラメータ (YYYY-MM) が必要です' }, { status: 400 })
  }

  const [y, m] = month.split('-').map(Number)
  const dateFrom = new Date(y, m - 1, 1)
  const dateTo = new Date(y, m, 0, 23, 59, 59)

  const records = await prisma.workerAttendance.findMany({
    where: {
      companyId: (session.user as any).companyId,
      workDate: { gte: dateFrom, lte: dateTo },
    },
    orderBy: [{ workerName: 'asc' }, { workDate: 'asc' }],
  })

  interface Summary {
    workerName: string
    workDays: number
    regularHours: number
    overtimeHours: number
    totalHours: number
  }

  const map = new Map<string, Summary>()

  for (const r of records) {
    let hoursWorked: number
    if (r.workingHours != null) {
      hoursWorked = r.workingHours
    } else {
      const entry = parseTimeToHours(r.entryTime)
      const exit = parseTimeToHours(r.exitTime)
      if (entry != null && exit != null && exit > entry) {
        hoursWorked = exit - entry
      } else {
        hoursWorked = 0
      }
    }

    const overtime = r.overtimeHours != null
      ? r.overtimeHours
      : Math.max(0, hoursWorked - 8)
    const regular = hoursWorked - overtime

    if (!map.has(r.workerName)) {
      map.set(r.workerName, { workerName: r.workerName, workDays: 0, regularHours: 0, overtimeHours: 0, totalHours: 0 })
    }
    const s = map.get(r.workerName)!
    s.workDays += 1
    s.regularHours += regular
    s.overtimeHours += overtime
    s.totalHours += hoursWorked
  }

  const result = Array.from(map.values())
    .map((s) => ({
      ...s,
      regularHours: Math.round(s.regularHours * 100) / 100,
      overtimeHours: Math.round(s.overtimeHours * 100) / 100,
      totalHours: Math.round(s.totalHours * 100) / 100,
    }))
    .sort((a, b) => b.overtimeHours - a.overtimeHours)

  return NextResponse.json(result)
}
