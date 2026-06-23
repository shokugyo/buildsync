import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const reporterInclude = { include: { company: { select: { name: true } } } }

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  const reports = await prisma.dailyReport.findMany({
    where: {
      project: { companyId: session.user.companyId },
      ...(projectId && { projectId }),
    },
    include: { project: true, reporter: reporterInclude },
    orderBy: { workDate: 'desc' },
  })

  return NextResponse.json(reports)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()

  const report = await prisma.dailyReport.create({
    data: {
      projectId: body.projectId,
      reporterId: session.user.id,
      workDate: new Date(body.workDate),
      weather: body.weather || null,
      content: body.content,
      workers: body.workers ? parseInt(body.workers) : null,
      progress: body.progress || null,
      issues: body.issues || null,
      nextPlan: body.nextPlan || null,
    },
    include: { project: true, reporter: reporterInclude },
  })

  return NextResponse.json(report, { status: 201 })
}
