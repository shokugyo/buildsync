import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const announcement = await prisma.announcement.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
    include: { author: { select: { id: true, name: true } } },
  })

  if (!announcement) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(announcement)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== '管理者' && role !== 'マネージャー') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const body = await req.json()

  const announcement = await prisma.announcement.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.isPinned !== undefined && { isPinned: body.isPinned }),
      ...(body.expiresAt !== undefined && { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }),
    },
    include: { author: { select: { id: true, name: true } } },
  })

  return NextResponse.json(announcement)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== '管理者' && role !== 'マネージャー') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  await prisma.announcement.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return PATCH(req, { params })
}
