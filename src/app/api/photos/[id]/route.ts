import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const photo = await prisma.photo.findFirst({
    where: { id: params.id, project: { companyId: (session.user as any).companyId } },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      uploader: { select: { id: true, name: true } },
    },
  })
  if (!photo) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  return NextResponse.json(photo)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()

  try {
    const photo = await prisma.photo.update({
      where: { id: params.id },
      data: {
        ...(body.comment !== undefined && { comment: body.comment || null }),
        ...(body.location !== undefined && { location: body.location || null }),
        ...(body.tags !== undefined && { tags: body.tags || null }),
        ...(body.shootingType !== undefined && { shootingType: body.shootingType || null }),
        ...(body.blackboardData !== undefined && { blackboardData: body.blackboardData }),
        ...(body.latitude !== undefined && { latitude: body.latitude != null ? Number(body.latitude) : null }),
        ...(body.longitude !== undefined && { longitude: body.longitude != null ? Number(body.longitude) : null }),
        ...(body.is360 !== undefined && { is360: body.is360 === true || body.is360 === 'true' }),
        ...(body.category !== undefined && { category: body.category || '一般' }),
      },
      include: { uploader: true, project: true },
    })
    return NextResponse.json(photo)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    await prisma.photo.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
