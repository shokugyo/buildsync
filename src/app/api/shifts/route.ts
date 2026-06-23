import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('weekStart')
  const projectId = searchParams.get('projectId')

  const where: any = { companyId }
  if (projectId) where.projectId = projectId
  if (weekStart) {
    const start = new Date(weekStart)
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 7)
    where.date = { gte: start, lt: end }
  }

  const shifts = await prisma.shift.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })

  return NextResponse.json(shifts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { userId, date, startTime, endTime, projectId, role, notes } = body

  if (!userId) return NextResponse.json({ error: 'ユーザーは必須です' }, { status: 400 })
  if (!date) return NextResponse.json({ error: '日付は必須です' }, { status: 400 })
  if (!startTime) return NextResponse.json({ error: '開始時間は必須です' }, { status: 400 })
  if (!endTime) return NextResponse.json({ error: '終了時間は必須です' }, { status: 400 })

  const shift = await prisma.shift.create({
    data: {
      userId,
      date: new Date(date),
      startTime,
      endTime,
      projectId: projectId || null,
      role: role || null,
      notes: notes || null,
      companyId,
    },
    include: {
      user: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(shift, { status: 201 })
}
