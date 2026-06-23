import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const survey = await prisma.customerSurvey.findFirst({
    where: { id: params.id, companyId },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      customer: { select: { id: true, name: true } },
    },
  })

  if (!survey) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  return NextResponse.json(survey)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const body = await req.json()

  const survey = await prisma.customerSurvey.findFirst({ where: { id: params.id, companyId } })
  if (!survey) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const updated = await prisma.customerSurvey.update({
    where: { id: params.id },
    data: body,
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      customer: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(updated)
}
