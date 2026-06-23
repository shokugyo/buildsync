import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; pinId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { resolvedAt } = body

  const pin = await prisma.drawingPin.findUnique({ where: { id: params.pinId } })
  if (!pin) return NextResponse.json({ error: 'ピンが見つかりません' }, { status: 404 })
  if (pin.drawingId !== params.id) return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })

  const updated = await prisma.drawingPin.update({
    where: { id: params.pinId },
    data: {
      resolvedAt: resolvedAt ? new Date(resolvedAt) : null,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; pinId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const pin = await prisma.drawingPin.findUnique({ where: { id: params.pinId } })
  if (!pin) return NextResponse.json({ error: 'ピンが見つかりません' }, { status: 404 })
  if (pin.drawingId !== params.id) return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })

  const userId = (session.user as any).id
  if (pin.authorId !== userId) {
    return NextResponse.json({ error: '削除できるのは作成者のみです' }, { status: 403 })
  }

  await prisma.drawingPin.delete({ where: { id: params.pinId } })

  return NextResponse.json({ success: true })
}
