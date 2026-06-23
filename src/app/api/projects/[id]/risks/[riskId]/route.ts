import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; riskId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { title, description, probability, impact, category, status, mitigation, owner } = body

  const existing = await prisma.projectRisk.findFirst({
    where: { id: params.riskId, projectId: params.id, companyId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const newProbability = probability !== undefined ? Number(probability) : existing.probability
  const newImpact = impact !== undefined ? Number(impact) : existing.impact
  const riskScore = newProbability * newImpact

  const risk = await prisma.projectRisk.update({
    where: { id: params.riskId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(probability !== undefined && { probability: Number(probability) }),
      ...(impact !== undefined && { impact: Number(impact) }),
      riskScore,
      ...(category !== undefined && { category }),
      ...(status !== undefined && { status }),
      ...(mitigation !== undefined && { mitigation }),
      ...(owner !== undefined && { owner }),
    },
  })

  return NextResponse.json(risk)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; riskId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const existing = await prisma.projectRisk.findFirst({
    where: { id: params.riskId, projectId: params.id, companyId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.projectRisk.delete({ where: { id: params.riskId } })
  return NextResponse.json({ success: true })
}
