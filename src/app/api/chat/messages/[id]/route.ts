import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const message = await prisma.chatMessage.findUnique({ where: { id: params.id } })
  if (!message) return NextResponse.json({ error: 'メッセージが見つかりません' }, { status: 404 })
  if (message.senderId !== (session.user as any).id) {
    return NextResponse.json({ error: '自分のメッセージのみ編集できます' }, { status: 403 })
  }

  const body = await req.json()
  const updated = await prisma.chatMessage.update({
    where: { id: params.id },
    data: { content: body.content, editedAt: new Date() },
    include: { sender: true, reactions: { include: { user: true } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const message = await prisma.chatMessage.findUnique({ where: { id: params.id } })
  if (!message) return NextResponse.json({ error: 'メッセージが見つかりません' }, { status: 404 })
  if (message.senderId !== (session.user as any).id) {
    return NextResponse.json({ error: '自分のメッセージのみ削除できます' }, { status: 403 })
  }

  // Logical delete
  const updated = await prisma.chatMessage.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
    include: { sender: true, reactions: { include: { user: true } } },
  })
  return NextResponse.json(updated)
}
