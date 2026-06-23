import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const userId = (session.user as any).id

  // Get all messages in this room
  const messages = await prisma.chatMessage.findMany({
    where: { roomId: params.roomId },
    select: { id: true },
  })

  // Mark all as read (upsert to avoid duplicates)
  await Promise.all(messages.map(msg =>
    prisma.chatMessageRead.upsert({
      where: { messageId_userId: { messageId: msg.id, userId } },
      create: { messageId: msg.id, userId },
      update: { readAt: new Date() },
    })
  ))

  return NextResponse.json({ ok: true })
}
