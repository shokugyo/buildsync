import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const monthParam = searchParams.get('month') // YYYY-MM

  const now = new Date()
  let year: number, month: number
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    ;[year, month] = monthParam.split('-').map(Number)
  } else {
    year = now.getFullYear()
    month = now.getMonth() + 1
  }

  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59)

  const attendances = await prisma.workerAttendance.findMany({
    where: {
      companyId: (session.user as any).companyId,
      workDate: { gte: monthStart, lte: monthEnd },
      ...(projectId ? { projectId } : {}),
    },
  })

  // Total worker-days: distinct worker+date combos
  const workerDateSet = new Set(
    attendances.map(a => `${a.workerName}::${a.workDate.toISOString().split('T')[0]}`)
  )
  const totalWorkerDays = workerDateSet.size

  // Working days in the month: distinct dates that have any attendance
  const distinctDates = new Set(
    attendances.map(a => a.workDate.toISOString().split('T')[0])
  )
  const workingDays = distinctDates.size
  const avgDailyHeadcount =
    workingDays > 0
      ? Math.round((totalWorkerDays / workingDays) * 100) / 100
      : 0

  // Total working hours and overtime
  const totalHours =
    Math.round(
      attendances.reduce((sum, a) => sum + (a.workingHours ?? 0), 0) * 100
    ) / 100
  const overtimeHours =
    Math.round(
      attendances.reduce((sum, a) => sum + (a.overtimeHours ?? 0), 0) * 100
    ) / 100

  // Worker summary
  const workerMap = new Map<
    string,
    { workerName: string; company: string | null; days: Set<string>; totalHours: number; overtimeHours: number }
  >()

  for (const a of attendances) {
    const dateStr = a.workDate.toISOString().split('T')[0]
    const existing = workerMap.get(a.workerName)
    if (existing) {
      existing.days.add(dateStr)
      existing.totalHours += a.workingHours ?? 0
      existing.overtimeHours += a.overtimeHours ?? 0
    } else {
      workerMap.set(a.workerName, {
        workerName: a.workerName,
        company: a.company,
        days: new Set([dateStr]),
        totalHours: a.workingHours ?? 0,
        overtimeHours: a.overtimeHours ?? 0,
      })
    }
  }

  const workerSummary = Array.from(workerMap.values())
    .map(w => ({
      workerName: w.workerName,
      company: w.company,
      days: w.days.size,
      totalHours: Math.round(w.totalHours * 100) / 100,
      overtimeHours: Math.round(w.overtimeHours * 100) / 100,
    }))
    .sort((a, b) => b.days - a.days)

  const top5 = workerSummary.slice(0, 5)

  return NextResponse.json({
    month: `${year}-${String(month).padStart(2, '0')}`,
    totalWorkerDays,
    avgDailyHeadcount,
    workingDays,
    totalHours,
    overtimeHours,
    top5Workers: top5,
    workerSummary,
  })
}
