import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyProjectMembers, sendNotification } from '@/lib/notify'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { content, location, assigneeId, dueDate, status, photoIds, beforePhotoIds, afterPhotoIds } = body

  try {
    const defect = await prisma.defect.update({
      where: { id: params.id },
      data: {
        ...(content !== undefined && { content }),
        ...(location !== undefined && { location }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(status !== undefined && { status }),
        ...(photoIds !== undefined && { photoIds: photoIds || null }),
        ...(beforePhotoIds !== undefined && { beforePhotoIds: beforePhotoIds || null }),
        ...(afterPhotoIds !== undefined && { afterPhotoIds: afterPhotoIds || null }),
      },
      include: { assignee: { select: { id: true, name: true } } },
    })

    // N-010: 確認待ち・確認済通知
    if (status === '確認待ち' || status === '確認済') {
      await notifyProjectMembers({
        projectId: defect.projectId,
        excludeUserId: (session.user as any).id,
        title: status === '確認済' ? '是正が確認済になりました' : '是正完了報告が届きました',
        content: `是正「${defect.content.slice(0, 40)}」のステータスが「${status}」になりました`,
        type: 'defect',
        link: `/defects`,
      })
    }

    // 確認済になった場合、担当者に個別通知
    if (status === '確認済' && defect.assigneeId && defect.assigneeId !== (session.user as any).id) {
      await sendNotification({
        userId: defect.assigneeId,
        title: '是正が確認済になりました',
        content: `担当している是正「${defect.content.slice(0, 40)}」が確認済として承認されました`,
        type: 'defect',
        link: `/defects`,
      })
    }

    // 差戻し時は担当者に通知
    if (status === '差戻し' && defect.assigneeId && defect.assigneeId !== (session.user as any).id) {
      await sendNotification({
        userId: defect.assigneeId,
        title: '是正が差戻しされました',
        content: `担当している是正「${defect.content.slice(0, 40)}」が差戻しされました。再度対応してください`,
        type: 'defect',
        link: `/defects`,
      })
    }

    return NextResponse.json(defect)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { status } = body

  if (!status) return NextResponse.json({ error: 'status は必須です' }, { status: 400 })

  try {
    const defect = await prisma.defect.update({
      where: { id: params.id },
      data: { status },
      include: { assignee: { select: { id: true, name: true } } },
    })

    // 確認待ち・確認済通知
    if (status === '確認待ち' || status === '確認済') {
      await notifyProjectMembers({
        projectId: defect.projectId,
        excludeUserId: (session.user as any).id,
        title: status === '確認済' ? '是正が確認済になりました' : '是正完了報告が届きました',
        content: `是正「${defect.content.slice(0, 40)}」のステータスが「${status}」になりました`,
        type: 'defect',
        link: `/defects`,
      })
    }

    // 確認済になった場合、担当者に個別通知
    if (status === '確認済' && defect.assigneeId && defect.assigneeId !== (session.user as any).id) {
      await sendNotification({
        userId: defect.assigneeId,
        title: '是正が確認済になりました',
        content: `担当している是正「${defect.content.slice(0, 40)}」が確認済として承認されました`,
        type: 'defect',
        link: `/defects`,
      })
    }

    // 差戻し時は担当者に通知
    if (status === '差戻し' && defect.assigneeId && defect.assigneeId !== (session.user as any).id) {
      await sendNotification({
        userId: defect.assigneeId,
        title: '是正が差戻しされました',
        content: `担当している是正「${defect.content.slice(0, 40)}」が差戻しされました。再度対応してください`,
        type: 'defect',
        link: `/defects`,
      })
    }

    return NextResponse.json(defect)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    await prisma.defect.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
