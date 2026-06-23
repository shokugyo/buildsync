import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const companyId = (session.user as any).companyId

  const reports = await prisma.workReport.findMany({
    where: { companyId, ...(projectId && { projectId }) },
    include: {
      reporter: { select: { id: true, name: true, company: { select: { name: true } } } },
      approver: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { reportDate: 'desc' },
  })

  return NextResponse.json(reports)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { projectId, location, reportDate, content, photoIds, workerCount, workHours, weather, materials, equipment, nextDayPlan, comment } = body
  const userId = (session.user as any).id
  const companyId = (session.user as any).companyId

  if (!projectId || !content || !reportDate) {
    return NextResponse.json({ error: '案件、報告内容、報告日は必須です' }, { status: 400 })
  }

  const report = await prisma.workReport.create({
    data: {
      projectId,
      reporterId: userId,
      location: location || null,
      reportDate: new Date(reportDate),
      content,
      photoIds: JSON.stringify(photoIds || []),
      companyId,
      workerCount: workerCount !== '' && workerCount !== undefined && workerCount !== null ? Number(workerCount) : null,
      workHours: workHours !== '' && workHours !== undefined && workHours !== null ? Number(workHours) : null,
      weather: weather || null,
      materials: materials || null,
      equipment: equipment || null,
      nextDayPlan: nextDayPlan || null,
      comment: comment || null,
    },
    include: {
      reporter: { select: { id: true, name: true, company: { select: { name: true } } } },
      approver: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(report, { status: 201 })
}
