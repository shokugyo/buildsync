import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const activities = await prisma.leadActivity.findMany({
    where: { leadId: params.id },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { activityDate: 'desc' },
  })

  return NextResponse.json(activities)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { type, content, activityDate } = body

  if (!type || !content || !activityDate) {
    return NextResponse.json({ error: '種別・内容・日付は必須です' }, { status: 400 })
  }

  const activity = await prisma.leadActivity.create({
    data: {
      leadId: params.id,
      type,
      content,
      activityDate: new Date(activityDate),
      userId: session.user.id,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(activity, { status: 201 })
}
