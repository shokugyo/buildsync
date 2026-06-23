import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const room = await prisma.chatRoom.findUnique({
    where: { id: params.id },
    include: { project: true },
  })

  if (!room) return NextResponse.json({ error: 'ルームが見つかりません' }, { status: 404 })
  if (room.project.companyId !== (session.user as any).companyId) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
  }

  await prisma.chatMessage.deleteMany({ where: { roomId: params.id } })
  await prisma.chatRoom.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
