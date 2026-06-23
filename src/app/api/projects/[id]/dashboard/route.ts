import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const projectId = params.id

  const [schedules, orders, defectCount, pendingOrderCount, recentPhotos, project] = await Promise.all([
    prisma.schedule.findMany({ where: { projectId }, select: { status: true } }),
    prisma.order.findMany({ where: { projectId }, select: { totalAmount: true, status: true } }),
    prisma.defect.count({ where: { projectId, status: { not: '是正完了' } } }),
    prisma.order.count({ where: { projectId, status: '承認待ち' } }),
    prisma.photo.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, filePath: true, comment: true },
    }),
    prisma.project.findUnique({
      where: { id: projectId },
      select: { contractAmount: true },
    }),
  ])

  const upcomingSchedules = await prisma.schedule.findMany({
    where: { projectId, status: { not: '完了' } },
    orderBy: { startDate: 'asc' },
    take: 3,
    select: { id: true, name: true, startDate: true, status: true },
  })

  const totalSchedules = schedules.length
  const completedSchedules = schedules.filter((s) => s.status === '完了').length
  const completionRate = totalSchedules > 0 ? Math.round((completedSchedules / totalSchedules) * 100) : 0

  const contractAmount = project?.contractAmount ?? 0
  const totalOrdered = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const usageRate = contractAmount > 0 ? Math.round((totalOrdered / contractAmount) * 100) : 0

  return NextResponse.json({
    scheduleStats: { total: totalSchedules, completed: completedSchedules, completionRate },
    budgetStats: { contractAmount, totalOrdered, usageRate },
    openDefects: defectCount,
    pendingOrders: pendingOrderCount,
    recentPhotos: recentPhotos.map((p) => ({ id: p.id, fileUrl: p.filePath, fileName: p.comment || '写真' })),
    upcomingSchedules: upcomingSchedules.map((s) => ({
      id: s.id,
      name: s.name,
      startDate: s.startDate,
      status: s.status,
    })),
  })
}
