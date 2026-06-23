import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const companyId = (session.user as { companyId: string }).companyId

  const patrols = await prisma.safetyPatrol.findMany({
    where: {
      companyId,
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      patroller: { select: { id: true, name: true } },
    },
    orderBy: { patrolDate: 'desc' },
  })

  return NextResponse.json(patrols)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { projectId, patrolDate, checkItems, overallResult, notes, correctionRequired, patrolledBy } = body

  if (!projectId || !patrolDate || !checkItems) {
    return NextResponse.json({ error: '案件・日付・チェック項目は必須です' }, { status: 400 })
  }

  const patrol = await prisma.safetyPatrol.create({
    data: {
      projectId,
      patrolDate: new Date(patrolDate),
      patrolledBy: patrolledBy || (session.user as { id: string }).id,
      checkItems: typeof checkItems === 'string' ? checkItems : JSON.stringify(checkItems),
      overallResult: overallResult || '良好',
      correctionRequired: correctionRequired ?? false,
      notes: notes || null,
      companyId: (session.user as { companyId: string }).companyId,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      patroller: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(patrol, { status: 201 })
}
