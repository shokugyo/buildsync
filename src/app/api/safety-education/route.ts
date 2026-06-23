import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const month = searchParams.get('month')
  const companyId = (session.user as { companyId: string }).companyId

  let dateFilter: object = {}
  if (month) {
    const [year, m] = month.split('-').map(Number)
    dateFilter = { educatedAt: { gte: new Date(year, m - 1, 1), lt: new Date(year, m, 1) } }
  }

  const records = await prisma.safetyEducation.findMany({
    where: {
      companyId,
      ...(projectId && { projectId }),
      ...dateFilter,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { educatedAt: 'desc' },
  })

  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { projectId, title, educatedAt, instructor, attendees, content } = body

  if (!title || !educatedAt) {
    return NextResponse.json({ error: 'タイトルと実施日は必須です' }, { status: 400 })
  }

  const record = await prisma.safetyEducation.create({
    data: {
      projectId: projectId || null,
      title,
      educatedAt: new Date(educatedAt),
      instructor: instructor || null,
      attendees: typeof attendees === 'string' ? attendees : JSON.stringify(attendees),
      content: content || null,
      companyId: (session.user as { companyId: string }).companyId,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(record, { status: 201 })
}
