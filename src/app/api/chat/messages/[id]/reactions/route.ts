import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const userId = (session.user as any).id
  const reactions = await prisma.chatReaction.findMany({
    where: { messageId: params.id },
    include: { user: { select: { id: true, name: true } } },
  })

  // Group by emoji
  const grouped: Record<string, { emoji: string; count: number; reacted: boolean; users: string[] }> = {}
  for (const r of reactions) {
    if (!grouped[r.emoji]) {
      grouped[r.emoji] = { emoji: r.emoji, count: 0, reacted: false, users: [] }
    }
    grouped[r.emoji].count++
    grouped[r.emoji].users.push(r.user.name)
    if (r.userId === userId) grouped[r.emoji].reacted = true
  }

  return NextResponse.json(Object.values(grouped))
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const userId = (session.user as any).id
  const body = await req.json()
  const { emoji } = body

  if (!emoji) return NextResponse.json({ error: 'emojiが必要です' }, { status: 400 })

  // Check if reaction exists (toggle)
  const existing = await prisma.chatReaction.findUnique({
    where: { messageId_userId_emoji: { messageId: params.id, userId, emoji } },
  })

  if (existing) {
    await prisma.chatReaction.delete({ where: { id: existing.id } })
    return NextResponse.json({ action: 'removed' })
  } else {
    await prisma.chatReaction.create({
      data: { messageId: params.id, userId, emoji },
    })
    return NextResponse.json({ action: 'added' }, { status: 201 })
  }
}
