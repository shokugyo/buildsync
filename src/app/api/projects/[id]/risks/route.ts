import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const risks = await prisma.projectRisk.findMany({
    where: { projectId: params.id, companyId },
    orderBy: { riskScore: 'desc' },
  })

  return NextResponse.json(risks)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { title, description, probability, impact, category, status, mitigation, owner } = body

  if (!title || !probability || !impact) {
    return NextResponse.json({ error: 'タイトル、発生確率、影響度は必須です' }, { status: 400 })
  }

  const riskScore = Number(probability) * Number(impact)

  const risk = await prisma.projectRisk.create({
    data: {
      projectId: params.id,
      title,
      description: description || null,
      probability: Number(probability),
      impact: Number(impact),
      riskScore,
      category: category || null,
      status: status || '未対応',
      mitigation: mitigation || null,
      owner: owner || null,
      companyId,
    },
  })

  return NextResponse.json(risk, { status: 201 })
}
