import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const survey = await prisma.customerSurvey.findUnique({
    where: { token: params.token },
    include: {
      project: { select: { name: true } },
      customer: { select: { name: true } },
    },
  })

  if (!survey) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  return NextResponse.json(survey)
}

export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  const survey = await prisma.customerSurvey.findUnique({ where: { token: params.token } })
  if (!survey) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  if (survey.respondedAt) return NextResponse.json({ error: 'すでに回答済みです' }, { status: 400 })

  const body = await req.json()
  const { overallScore, qualityScore, scheduleScore, communicationScore, comments } = body

  const updated = await prisma.customerSurvey.update({
    where: { token: params.token },
    data: {
      overallScore: overallScore ?? undefined,
      qualityScore: qualityScore ?? undefined,
      scheduleScore: scheduleScore ?? undefined,
      communicationScore: communicationScore ?? undefined,
      comments: comments ?? undefined,
      respondedAt: new Date(),
      status: '回答済',
    },
  })

  return NextResponse.json(updated)
}
