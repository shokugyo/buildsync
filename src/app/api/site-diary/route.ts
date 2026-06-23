import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const month = searchParams.get('month') // YYYY-MM

  if (!projectId || !month) {
    return NextResponse.json({ error: 'projectId と month は必須です' }, { status: 400 })
  }

  const [year, mon] = month.split('-').map(Number)
  const startDate = new Date(year, mon - 1, 1)
  const endDate = new Date(year, mon, 1)

  const diaries = await prisma.siteDiary.findMany({
    where: {
      projectId,
      companyId: session.user.companyId,
      date: { gte: startDate, lt: endDate },
    },
    include: {
      author: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  })

  return NextResponse.json(diaries)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()

  if (!body.projectId || !body.date) {
    return NextResponse.json({ error: 'projectId と date は必須です' }, { status: 400 })
  }

  try {
    const diary = await prisma.siteDiary.upsert({
      where: {
        projectId_date: {
          projectId: body.projectId,
          date: new Date(body.date),
        },
      },
      update: {
        weather: body.weather || null,
        temperature: body.temperature != null ? Number(body.temperature) : null,
        workers: body.workers != null ? Number(body.workers) : null,
        workContent: body.workContent || null,
        issues: body.issues || null,
        tomorrowPlan: body.tomorrowPlan || null,
      },
      create: {
        projectId: body.projectId,
        date: new Date(body.date),
        weather: body.weather || null,
        temperature: body.temperature != null ? Number(body.temperature) : null,
        workers: body.workers != null ? Number(body.workers) : null,
        workContent: body.workContent || null,
        issues: body.issues || null,
        tomorrowPlan: body.tomorrowPlan || null,
        authorId: session.user.id,
        companyId: session.user.companyId,
      },
      include: { author: { select: { name: true } } },
    })

    return NextResponse.json(diary, { status: 201 })
  } catch {
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
  }
}
