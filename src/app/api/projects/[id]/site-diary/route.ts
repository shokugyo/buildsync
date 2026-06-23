import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // YYYY-MM

  // Verify project belongs to this company
  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true },
  })
  if (!project) return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })

  const whereClause: any = { projectId: params.id, companyId }

  if (month) {
    const [year, mon] = month.split('-').map(Number)
    whereClause.date = {
      gte: new Date(year, mon - 1, 1),
      lt: new Date(year, mon, 1),
    }
  }

  const diaries = await prisma.siteDiary.findMany({
    where: whereClause,
    include: { author: { select: { name: true } } },
    orderBy: { date: 'asc' },
  })

  return NextResponse.json(diaries)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const userId = (session.user as any).id

  // Verify project belongs to this company
  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true },
  })
  if (!project) return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })

  const body = await req.json()
  const { date, weather, temperature, workers, workContent, issues, tomorrowPlan } = body

  if (!date) {
    return NextResponse.json({ error: '日付は必須です' }, { status: 400 })
  }

  try {
    const diary = await prisma.siteDiary.upsert({
      where: {
        projectId_date: {
          projectId: params.id,
          date: new Date(date),
        },
      },
      update: {
        weather: weather || null,
        temperature: temperature != null ? Number(temperature) : null,
        workers: workers != null ? Number(workers) : null,
        workContent: workContent || null,
        issues: issues || null,
        tomorrowPlan: tomorrowPlan || null,
      },
      create: {
        projectId: params.id,
        date: new Date(date),
        weather: weather || null,
        temperature: temperature != null ? Number(temperature) : null,
        workers: workers != null ? Number(workers) : null,
        workContent: workContent || null,
        issues: issues || null,
        tomorrowPlan: tomorrowPlan || null,
        authorId: userId,
        companyId,
      },
      include: { author: { select: { name: true } } },
    })

    return NextResponse.json(diary, { status: 201 })
  } catch {
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
  }
}
