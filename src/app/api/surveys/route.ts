import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const surveys = await prisma.customerSurvey.findMany({
    where: { companyId },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      customer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(surveys)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const body = await req.json()
  const { projectId } = body

  if (!projectId) return NextResponse.json({ error: '案件IDは必須です' }, { status: 400 })

  const project = await prisma.project.findFirst({ where: { id: projectId, companyId } })
  if (!project) return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })

  const survey = await prisma.customerSurvey.create({
    data: {
      projectId,
      customerId: project.customerId ?? undefined,
      companyId,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      customer: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(survey, { status: 201 })
}
