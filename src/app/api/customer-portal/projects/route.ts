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
        select: { id: true, filePath: true, comment: true },
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
        select: { progress: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const result = projects.map(p => {
    const scheduleCount = p.schedules.length
    const avgProgress = scheduleCount > 0
      ? Math.round(p.schedules.reduce((sum: number, s: { progress: number }) => sum + (s.progress || 0), 0) / scheduleCount)
      : 0

    return {
      id: p.id,
      projectNumber: p.projectNumber,
      name: p.name,
      status: p.status,
      address: p.address,
      startDate: p.startDate,
      endDate: p.endDate,
      progress: avgProgress,
      photoCount: p.photos.length,
      pendingInspections: p.inspections.length,
      openDefects: p.defects.length,
      recentPhotos: p.photos.map(ph => ({
        id: ph.id,
        filePath: ph.filePath,
        caption: ph.comment,
        takenAt: null,
      })),
    }
  })

  return NextResponse.json(result)
}
