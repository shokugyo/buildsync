import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const companyId = (session.user as any).companyId

  const nearMisses = await prisma.nearMiss.findMany({
    where: {
      companyId,
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      reporter: { select: { id: true, name: true } },
    },
    orderBy: { occurredAt: 'desc' },
  })

  return NextResponse.json(nearMisses)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { projectId, occurredAt, location, situation, cause, countermeasure, severity } = body

  if (!projectId || !situation) {
    return NextResponse.json({ error: '案件と状況説明は必須です' }, { status: 400 })
  }

  const nearMiss = await prisma.nearMiss.create({
    data: {
      projectId,
      reporterId: (session.user as any).id,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      location: location || null,
      situation,
      cause: cause || null,
      countermeasure: countermeasure || null,
      severity: severity || '低',
      status: '報告済',
      companyId: (session.user as any).companyId,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      reporter: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(nearMiss, { status: 201 })
}
