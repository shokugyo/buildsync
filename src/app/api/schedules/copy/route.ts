import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: { sourceProjectId?, templateId?, targetProjectId }
// sourceProjectId: copy Schedules from that project to targetProjectId
//   - Dates are offset so the earliest start becomes today, others maintain relative offset
// templateId: copy ScheduleTemplate items (ProjectTemplate) to targetProjectId
//   - offsetDays from template become absolute dates starting from today
// Returns: { success: true, created: number }

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { sourceProjectId, templateId, targetProjectId } = await req.json()

  if (!targetProjectId) {
    return NextResponse.json({ error: 'targetProjectId は必須です' }, { status: 400 })
  }
  if (!sourceProjectId && !templateId) {
    return NextResponse.json({ error: 'sourceProjectId または templateId が必要です' }, { status: 400 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const addDays = (date: Date, days: number): Date => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }

  let created = 0

  if (sourceProjectId) {
    // Copy from another project's Schedules
    const sourceSchedules = await prisma.schedule.findMany({
      where: { projectId: sourceProjectId },
      orderBy: { startDate: 'asc' },
    })

    if (sourceSchedules.length === 0) {
      return NextResponse.json({ success: true, created: 0 })
    }

    // Find the earliest startDate to compute offset
    const earliestStart = sourceSchedules.reduce((min, s) =>
      s.startDate < min ? s.startDate : min, sourceSchedules[0].startDate
    )
    const baseDate = new Date(earliestStart)
    baseDate.setHours(0, 0, 0, 0)

    const data = sourceSchedules.map((s) => {
      const startOffset = Math.round(
        (new Date(s.startDate).getTime() - baseDate.getTime()) / 86400000
      )
      const endOffset = Math.round(
        (new Date(s.endDate).getTime() - baseDate.getTime()) / 86400000
      )
      return {
        projectId: targetProjectId,
        name: s.name,
        startDate: addDays(today, startOffset),
        endDate: addDays(today, endOffset),
        progress: 0,
        status: '未着手',
        category: s.category,
        notes: s.notes,
        assigneeId: s.assigneeId,
      }
    })

    const result = await prisma.schedule.createMany({ data })
    created = result.count
  } else if (templateId) {
    // Copy from ProjectTemplate's ScheduleTemplate items
    const template = await prisma.projectTemplate.findUnique({
      where: { id: templateId },
      include: { scheduleTemplates: { orderBy: { offsetDays: 'asc' } } },
    })

    if (!template || template.scheduleTemplates.length === 0) {
      return NextResponse.json({ success: true, created: 0 })
    }

    const data = template.scheduleTemplates.map((st) => ({
      projectId: targetProjectId,
      name: st.name,
      startDate: addDays(today, st.offsetDays),
      endDate: addDays(today, st.offsetDays + st.durationDays - 1),
      progress: 0,
      status: '未着手',
      category: st.category,
    }))

    const result = await prisma.schedule.createMany({ data })
    created = result.count
  }

  return NextResponse.json({ success: true, created })
}
