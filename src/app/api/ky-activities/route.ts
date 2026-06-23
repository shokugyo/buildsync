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

  const activities = await prisma.kyActivity.findMany({
    where: {
      companyId,
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { activityDate: 'desc' },
  })

  return NextResponse.json(activities)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { projectId, activityDate, leader, participants, risks, location, notes } = body

  if (!projectId || !activityDate || !risks) {
    return NextResponse.json({ error: '案件・日付・リスクは必須です' }, { status: 400 })
  }

  const activity = await prisma.kyActivity.create({
    data: {
      projectId,
      activityDate: new Date(activityDate),
      leader: leader || null,
      participants: participants || null,
      risks,
      location: location || null,
      notes: notes || null,
      companyId: (session.user as any).companyId,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(activity, { status: 201 })
}
