import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyProjectMembers, sendNotification } from '@/lib/notify'
import { dispatchWebhook } from '@/lib/webhook'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get('roomId')

  if (roomId) {
    const messages = await prisma.chatMessage.findMany({
      where: { roomId },
      include: {
        sender: { include: { company: { select: { name: true } } } },
        reactions: { include: { user: { select: { id: true, name: true } } } },
        readBy: { select: { userId: true, readAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(messages)
  }

  const userId = (session.user as any).id

  const rooms = await prisma.chatRoom.findMany({
    where: { project: { companyId: session.user.companyId } },
    include: {
      project: true,
      messages: {
        include: { sender: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Add unread count per room
  const roomsWithUnread = await Promise.all(rooms.map(async (room) => {
    const totalMessages = await prisma.chatMessage.count({ where: { roomId: room.id } })
    const readCount = await prisma.chatMessageRead.count({
      where: { userId, message: { roomId: room.id } },
    })
    return { ...room, unreadCount: Math.max(0, totalMessages - readCount) }
  }))

  return NextResponse.json(roomsWithUnread)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()

  if (body.type === 'message') {
    const message = await prisma.chatMessage.create({
      data: {
        roomId: body.roomId,
        senderId: session.user.id,
        content: body.content,
        fileUrl: body.fileUrl || null,
        fileName: body.fileName || null,
        fileSize: body.fileSize || null,
        parentId: body.parentId || null,
      },
      include: { sender: true },
    })

    // N-004: チャット通知
    const room = await prisma.chatRoom.findUnique({
      where: { id: body.roomId },
      select: { projectId: true, name: true },
    })
    if (room?.projectId) {
      await notifyProjectMembers({
        projectId: room.projectId,
        excludeUserId: (session.user as any).id,
        title: 'チャットメッセージが届きました',
        content: `${(session.user as any).name || 'ユーザー'}: ${body.content.slice(0, 50)}${body.content.length > 50 ? '...' : ''}`,
        type: 'chat',
        link: `/projects/${room.projectId}`,
      })
    }

    // N-005: メンション通知
    const mentionMatches = body.content.match(/@([^\s@,、。！？]+)/g)
    if (mentionMatches && mentionMatches.length > 0) {
      const mentionedNames = mentionMatches.map((m: string) => m.slice(1))
      const mentionedUsers = await prisma.user.findMany({
        where: {
          companyId: (session.user as any).companyId,
          name: { in: mentionedNames },
        },
        select: { id: true },
      })
      for (const mu of mentionedUsers) {
        if (mu.id !== (session.user as any).id) {
          await sendNotification({
            userId: mu.id,
            title: 'メンションされました',
            content: `${(session.user as any).name || 'ユーザー'}: ${body.content.slice(0, 60)}${body.content.length > 60 ? '...' : ''}`,
            type: 'mention',
            link: room?.projectId ? `/projects/${room.projectId}` : '/chat',
          })
        }
      }
    }

    // Webhook: chat.message.created
    if (room?.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: room.projectId },
        select: { companyId: true },
      })
      if (project) {
        await dispatchWebhook(project.companyId, 'chat.message.created', {
          messageId: message.id,
          roomId: body.roomId,
          roomName: room.name,
          projectId: room.projectId,
          senderName: (session.user as any).name || session.user.email,
          contentPreview: body.content.slice(0, 100),
        })
      }
    }

    return NextResponse.json(message, { status: 201 })
  }

  const room = await prisma.chatRoom.create({
    data: {
      projectId: body.projectId,
      name: body.name,
    },
    include: { project: true },
  })

  return NextResponse.json(room, { status: 201 })
}
