import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyProjectMembers } from '@/lib/notify'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { name, startDate, endDate, actualStart, actualEnd, assigneeId, progress, status, notes, category } = body

  try {
    const existing = await prisma.schedule.findUnique({
      where: { id: params.id },
      select: { name: true, startDate: true, endDate: true, projectId: true },
    })

    const schedule = await prisma.schedule.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(startDate !== undefined && startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && endDate && { endDate: new Date(endDate) }),
        ...(actualStart !== undefined && { actualStart: actualStart ? new Date(actualStart) : undefined }),
        ...(actualEnd !== undefined && { actualEnd: actualEnd ? new Date(actualEnd) : undefined }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(progress !== undefined && { progress: Number(progress) }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(category !== undefined && { category: category || null }),
      },
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, projectNumber: true } },
      },
    })

    // N-003: 工程変更通知
    if (existing) {
      await notifyProjectMembers({
        projectId: schedule.projectId,
        excludeUserId: (session.user as any).id,
        title: '工程変更通知',
        content: `${schedule.project.name} の工程「${schedule.name}」が更新されました`,
        type: 'schedule_change',
        link: `/schedule?projectId=${schedule.projectId}`,
      })
    }

    return NextResponse.json(schedule)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    await prisma.schedule.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
