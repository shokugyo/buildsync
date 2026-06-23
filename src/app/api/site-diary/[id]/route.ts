import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const diary = await prisma.siteDiary.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
    include: { author: { select: { name: true } } },
  })

  if (!diary) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  return NextResponse.json(diary)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()

  try {
    const diary = await prisma.siteDiary.update({
      where: { id: params.id },
      data: {
        ...(body.weather !== undefined && { weather: body.weather || null }),
        ...(body.temperature !== undefined && { temperature: body.temperature != null ? Number(body.temperature) : null }),
        ...(body.workers !== undefined && { workers: body.workers != null ? Number(body.workers) : null }),
        ...(body.workContent !== undefined && { workContent: body.workContent || null }),
        ...(body.issues !== undefined && { issues: body.issues || null }),
        ...(body.tomorrowPlan !== undefined && { tomorrowPlan: body.tomorrowPlan || null }),
      },
      include: { author: { select: { name: true } } },
    })
    return NextResponse.json(diary)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    await prisma.siteDiary.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
