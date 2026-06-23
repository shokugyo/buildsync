import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const dependencies = await prisma.scheduleDependency.findMany({
    where: { scheduleId: params.id },
    include: {
      predecessor: { select: { id: true, name: true, startDate: true, endDate: true, status: true } },
    },
  })

  return NextResponse.json(dependencies)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { predecessorId } = body

  if (!predecessorId) {
    return NextResponse.json({ error: 'predecessorId は必須です' }, { status: 400 })
  }

  if (predecessorId === params.id) {
    return NextResponse.json({ error: '自己参照は設定できません' }, { status: 400 })
  }

  try {
    const dep = await prisma.scheduleDependency.create({
      data: {
        scheduleId: params.id,
        predecessorId,
      },
      include: {
        predecessor: { select: { id: true, name: true, startDate: true, endDate: true, status: true } },
      },
    })

    return NextResponse.json(dep, { status: 201 })
  } catch {
    return NextResponse.json({ error: '依存関係の追加に失敗しました（既に存在する可能性があります）' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { predecessorId } = body

  if (!predecessorId) {
    return NextResponse.json({ error: 'predecessorId は必須です' }, { status: 400 })
  }

  try {
    await prisma.scheduleDependency.deleteMany({
      where: { scheduleId: params.id, predecessorId },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
