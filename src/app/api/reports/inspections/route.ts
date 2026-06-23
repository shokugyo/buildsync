import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const month = searchParams.get('month')

  const companyId = (session.user as { companyId: string }).companyId

  let dateFrom: Date | undefined
  let dateTo: Date | undefined
  if (month) {
    const [year, m] = month.split('-').map(Number)
    dateFrom = new Date(year, m - 1, 1)
    dateTo = new Date(year, m, 1)
  }

  const inspections = await prisma.inspection.findMany({
    where: {
      project: { companyId },
      ...(projectId && { projectId }),
      ...(dateFrom && dateTo && {
        OR: [
          { actualDate: { gte: dateFrom, lt: dateTo } },
          { scheduledDate: { gte: dateFrom, lt: dateTo } },
        ],
      }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      inspector: { select: { id: true, name: true } },
      defects: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const rows = inspections.map((insp) => ({
    id: insp.id,
    date: insp.actualDate ?? insp.scheduledDate,
    type: insp.type,
    name: insp.name,
    inspector: insp.inspector?.name ?? null,
    result: insp.status,
    defectCount: insp.defects.length,
    openDefects: insp.defects.filter((d) => d.status !== '完了').length,
    resolvedDefects: insp.defects.filter((d) => d.status === '完了').length,
    project: insp.project,
  }))

  const total = rows.length
  const passed = rows.filter((r) => r.result === '合格').length
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0
  const openDefects = rows.reduce((s, r) => s + r.openDefects, 0)
  const resolvedDefects = rows.reduce((s, r) => s + r.resolvedDefects, 0)

  const now = new Date()
  const trend: { month: string; passRate: number; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const monthLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthInsp = await prisma.inspection.findMany({
      where: {
        project: { companyId },
        ...(projectId && { projectId }),
        OR: [
          { actualDate: { gte: d, lt: next } },
          { scheduledDate: { gte: d, lt: next } },
        ],
      },
      select: { status: true },
    })
    const mTotal = monthInsp.length
    const mPassed = monthInsp.filter((x) => x.status === '合格').length
    trend.push({
      month: monthLabel,
      passRate: mTotal > 0 ? Math.round((mPassed / mTotal) * 100) : 0,
      total: mTotal,
    })
  }

  return NextResponse.json({
    rows,
    summary: { total, passRate, openDefects, resolvedDefects },
    trend,
  })
}
