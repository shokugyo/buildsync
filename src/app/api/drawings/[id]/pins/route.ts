import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const pins = await prisma.drawingPin.findMany({
    where: { drawingId: params.id },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(pins)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { x, y, comment } = body

  if (typeof x !== 'number' || typeof y !== 'number' || !comment?.trim()) {
    return NextResponse.json({ error: '入力が不正です' }, { status: 400 })
  }

  const drawing = await prisma.drawing.findUnique({ where: { id: params.id } })
  if (!drawing) return NextResponse.json({ error: '図面が見つかりません' }, { status: 404 })

  const pin = await prisma.drawingPin.create({
    data: {
      drawingId: params.id,
      x,
      y,
      comment: comment.trim(),
      authorId: (session.user as any).id,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json(pin, { status: 201 })
}
