import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const evaluations = await prisma.supplierEvaluation.findMany({
    where: { supplierId: params.id, companyId: (session.user as any).companyId },
    include: {
      evaluator: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { evaluatedAt: 'desc' },
  })

  return NextResponse.json(evaluations)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { projectId, qualityScore, costScore, scheduleScore, safetyScore, comment, evaluatedAt } = body

  if (!qualityScore || !costScore || !scheduleScore || !safetyScore) {
    return NextResponse.json({ error: '全ての評価スコアは必須です' }, { status: 400 })
  }

  const overallScore = (qualityScore + costScore + scheduleScore + safetyScore) / 4

  try {
    const evaluation = await prisma.supplierEvaluation.create({
      data: {
        supplierId: params.id,
        projectId: projectId || null,
        qualityScore: Number(qualityScore),
        costScore: Number(costScore),
        scheduleScore: Number(scheduleScore),
        safetyScore: Number(safetyScore),
        overallScore,
        comment: comment || null,
        evaluatedBy: (session.user as any).id,
        evaluatedAt: evaluatedAt ? new Date(evaluatedAt) : new Date(),
        companyId: (session.user as any).companyId,
      },
      include: {
        evaluator: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(evaluation, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '評価の登録に失敗しました' }, { status: 500 })
  }
}
