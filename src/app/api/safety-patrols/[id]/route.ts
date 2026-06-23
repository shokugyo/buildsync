import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const patrol = await prisma.safetyPatrol.findUnique({
    where: { id: params.id },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      patroller: { select: { id: true, name: true } },
    },
  })

  if (!patrol) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  if (patrol.companyId !== (session.user as { companyId: string }).companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  return NextResponse.json(patrol)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { patrolDate, checkItems, overallResult, notes, correctionRequired, patrolledBy } = body

  try {
    const patrol = await prisma.safetyPatrol.update({
      where: { id: params.id },
      data: {
        ...(patrolDate !== undefined && { patrolDate: new Date(patrolDate) }),
        ...(checkItems !== undefined && {
          checkItems: typeof checkItems === 'string' ? checkItems : JSON.stringify(checkItems),
        }),
        ...(overallResult !== undefined && { overallResult }),
        ...(notes !== undefined && { notes }),
        ...(correctionRequired !== undefined && { correctionRequired }),
        ...(patrolledBy !== undefined && { patrolledBy }),
      },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        patroller: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(patrol)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    await prisma.safetyPatrol.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
