import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const userId = (session.user as any).id
  const companyId = (session.user as any).companyId

  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  })
  const memberProjectIds = memberships.map(m => m.projectId)

  const userEmail = session.user?.email || ''
  const customer = userEmail
    ? await prisma.customer.findFirst({ where: { email: userEmail, companyId } })
    : null

  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      OR: [
        { id: { in: memberProjectIds } },
        ...(customer ? [{ customerId: customer.id }] : []),
      ],
    },
    select: {
      id: true,
      projectNumber: true,
      name: true,
      status: true,
      address: true,
      startDate: true,
      endDate: true,
      photos: {
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, filePath: true, comment: true, createdAt: true },
      },
      inspections: {
        where: { status: { not: '完了' } },
        select: { id: true },
      },
      defects: {
        where: { status: { not: '是正済' } },
        select: { id: true },
      },
      schedules: {
        select: { id: true, progress: true, status: true, name: true, startDate: true, endDate: true },
      },
      reports: {
        orderBy: { workDate: 'desc' },
        take: 3,
        select: {
          id: true,
          workDate: true,
          content: true,
          progress: true,
          weather: true,
          reporter: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const result = projects.map(p => {
    const scheduleCount = p.schedules.length
    const completedSchedules = p.schedules.filter(s => s.status === '完了').length
    const avgProgress = scheduleCount > 0
      ? Math.round(p.schedules.reduce((sum: number, s: { progress: number }) => sum + (s.progress || 0), 0) / scheduleCount)
      : 0

    // Remaining days calculation
    const today = new Date()
    const remainingDays = p.endDate
      ? Math.ceil((new Date(p.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null

    return {
      id: p.id,
      projectNumber: p.projectNumber,
      name: p.name,
      status: p.status,
      address: p.address,
      startDate: p.startDate,
      endDate: p.endDate,
      progress: avgProgress,
      remainingDays,
      scheduleTotal: scheduleCount,
      scheduleCompleted: completedSchedules,
      photoCount: p.photos.length,
      pendingInspections: p.inspections.length,
      openDefects: p.defects.length,
      recentPhotos: p.photos.slice(0, 3).map(ph => ({
        id: ph.id,
        filePath: ph.filePath,
        caption: ph.comment,
        takenAt: ph.createdAt,
      })),
      allPhotos: p.photos.map(ph => ({
        id: ph.id,
        filePath: ph.filePath,
        caption: ph.comment,
        takenAt: ph.createdAt,
      })),
      recentReports: p.reports.map(r => ({
        id: r.id,
        workDate: r.workDate,
        content: r.content,
        progress: r.progress,
        weather: r.weather,
        reporterName: r.reporter?.name || null,
      })),
    }
  })

  return NextResponse.json(result)
}
