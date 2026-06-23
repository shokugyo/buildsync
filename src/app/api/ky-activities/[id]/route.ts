import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { projectId, activityDate, leader, participants, risks, location, notes } = body

  try {
    const activity = await prisma.kyActivity.update({
      where: { id: params.id },
      data: {
        ...(projectId !== undefined && { projectId }),
        ...(activityDate !== undefined && { activityDate: new Date(activityDate) }),
        ...(leader !== undefined && { leader: leader || null }),
        ...(participants !== undefined && { participants: participants || null }),
        ...(risks !== undefined && { risks }),
        ...(location !== undefined && { location: location || null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
      },
    })
    return NextResponse.json(activity)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    await prisma.kyActivity.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
