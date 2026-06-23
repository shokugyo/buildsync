import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { projectId, occurredAt, location, situation, cause, countermeasure, severity, status } = body

  try {
    const nearMiss = await prisma.nearMiss.update({
      where: { id: params.id },
      data: {
        ...(projectId !== undefined && projectId && { projectId }),
        ...(occurredAt !== undefined && { occurredAt: new Date(occurredAt) }),
        ...(location !== undefined && { location: location || null }),
        ...(situation !== undefined && { situation }),
        ...(cause !== undefined && { cause: cause || null }),
        ...(countermeasure !== undefined && { countermeasure: countermeasure || null }),
        ...(severity !== undefined && { severity }),
        ...(status !== undefined && { status }),
      },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        reporter: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(nearMiss)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    await prisma.nearMiss.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
