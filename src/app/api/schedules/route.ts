import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const startDateFrom = searchParams.get('startDateFrom')
  const startDateTo = searchParams.get('startDateTo')

  const schedules = await prisma.schedule.findMany({
    where: {
      project: { companyId: session.user.companyId },
      ...(projectId && { projectId }),
      ...(startDateFrom || startDateTo ? {
        startDate: {
          ...(startDateFrom && { gte: new Date(startDateFrom) }),
          ...(startDateTo && { lte: new Date(startDateTo) }),
        },
      } : {}),
    },
    include: {
      project: true,
      assignee: { include: { company: { select: { id: true, name: true } } } },
    },
    orderBy: { startDate: 'asc' },
  })

  return NextResponse.json(schedules)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()

  const schedule = await prisma.schedule.create({
    data: {
      projectId: body.projectId,
      name: body.name,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      assigneeId: body.assigneeId || null,
      progress: body.progress || 0,
      status: body.status || '未着手',
      notes: body.notes || null,
      category: body.category || null,
    },
    include: { assignee: true, project: true },
  })

  return NextResponse.json(schedule, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { sourceProjectId, targetProjectId } = body

  if (!sourceProjectId || !targetProjectId) {
    return NextResponse.json({ error: 'sourceProjectId と targetProjectId は必須です' }, { status: 400 })
  }

  const companyId = (session.user as any).companyId

  const sourceSchedules = await prisma.schedule.findMany({
    where: { projectId: sourceProjectId, project: { companyId } },
  })

  if (sourceSchedules.length === 0) {
    return NextResponse.json({ error: '複製元の工程がありません' }, { status: 404 })
  }

  const created = await prisma.schedule.createMany({
    data: sourceSchedules.map(s => ({
      projectId: targetProjectId,
      name: s.name,
      startDate: s.startDate,
      endDate: s.endDate,
      category: s.category,
      status: '未着手',
      progress: 0,
      notes: s.notes,
    })),
  })

  return NextResponse.json({ count: created.count })
}
