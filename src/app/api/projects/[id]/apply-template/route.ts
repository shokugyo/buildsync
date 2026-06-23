import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  // Verify project belongs to company
  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
  })
  if (!project) return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 })

  const body = await req.json()
  const { templateId, startDate } = body

  if (!templateId || !startDate) {
    return NextResponse.json({ error: 'templateId と startDate は必須です' }, { status: 400 })
  }

  // Fetch template with schedule items
  const template = await prisma.projectTemplate.findFirst({
    where: { id: templateId, companyId },
    include: {
      scheduleTemplates: { orderBy: { offsetDays: 'asc' } },
    },
  })
  if (!template) return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 })

  if (template.scheduleTemplates.length === 0) {
    return NextResponse.json({ error: 'テンプレートに工程がありません' }, { status: 400 })
  }

  const base = new Date(startDate)

  const createdSchedules = await Promise.all(
    template.scheduleTemplates.map((item) => {
      const itemStart = new Date(base)
      itemStart.setDate(itemStart.getDate() + item.offsetDays)

      const itemEnd = new Date(itemStart)
      itemEnd.setDate(itemEnd.getDate() + item.durationDays - 1)

      return prisma.schedule.create({
        data: {
          projectId: params.id,
          name: item.name,
          startDate: itemStart,
          endDate: itemEnd,
          category: item.category || null,
          status: '未着手',
          progress: 0,
        },
      })
    })
  )

  return NextResponse.json({ created: createdSchedules.length, schedules: createdSchedules })
}
