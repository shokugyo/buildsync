import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const now = new Date()
  const announcements = await prisma.announcement.findMany({
    where: {
      companyId: session.user.companyId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { author: { select: { id: true, name: true } } },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(announcements)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== '管理者' && role !== 'マネージャー') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const body = await req.json()

  const announcement = await prisma.announcement.create({
    data: {
      title: body.title,
      content: body.content || null,
      category: body.category || 'お知らせ',
      isPinned: body.isPinned || false,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      status: '公開',
      authorId: session.user.id,
      companyId: session.user.companyId,
    },
    include: { author: { select: { id: true, name: true } } },
  })

  return NextResponse.json(announcement, { status: 201 })
}
