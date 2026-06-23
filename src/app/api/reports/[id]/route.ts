import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const report = await prisma.dailyReport.findUnique({
    where: { id: params.id },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      reporter: { select: { name: true } },
    },
  })
  if (!report) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  return NextResponse.json(report)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()

  try {
    const report = await prisma.dailyReport.update({
      where: { id: params.id },
      data: {
        ...(body.workDate !== undefined && { workDate: new Date(body.workDate) }),
        ...(body.weather !== undefined && { weather: body.weather || null }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.workers !== undefined && { workers: body.workers ? parseInt(body.workers) : null }),
        ...(body.progress !== undefined && { progress: body.progress || null }),
        ...(body.issues !== undefined && { issues: body.issues || null }),
        ...(body.nextPlan !== undefined && { nextPlan: body.nextPlan || null }),
      },
      include: { project: true, reporter: true },
    })
    return NextResponse.json(report)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    await prisma.dailyReport.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
