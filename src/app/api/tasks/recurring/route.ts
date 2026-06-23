import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayDayOfWeek = today.getDay()
  const todayDayOfMonth = today.getDate()

  const recurringTasks = await prisma.task.findMany({
    where: {
      isRecurring: true,
      parentTaskId: null,
      OR: [
        { recurringEndDate: null },
        { recurringEndDate: { gte: today } },
      ],
    },
  })

  let created = 0

  for (const task of recurringTasks) {
    if (!task.recurringPattern) continue

    let pattern: { frequency: string; dayOfWeek?: number; dayOfMonth?: number }
    try {
      pattern = JSON.parse(task.recurringPattern)
    } catch {
      continue
    }

    let matches = false
    if (pattern.frequency === 'daily') {
      matches = true
    } else if (pattern.frequency === 'weekly') {
      matches = pattern.dayOfWeek === todayDayOfWeek
    } else if (pattern.frequency === 'monthly') {
      matches = pattern.dayOfMonth === todayDayOfMonth
    }

    if (!matches) continue

    const startOfToday = today
    const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)

    const existing = await prisma.task.findFirst({
      where: {
        parentTaskId: task.id,
        createdAt: { gte: startOfToday, lte: endOfToday },
      },
    })

    if (existing) continue

    await prisma.task.create({
      data: {
        title: task.title,
        description: task.description,
        projectId: task.projectId,
        assignedTo: task.assignedTo,
        createdBy: task.createdBy,
        dueDate: today,
        priority: task.priority,
        status: '未着手',
        companyId: task.companyId,
        parentTaskId: task.id,
      },
    })
    created++
  }

  return NextResponse.json({ created })
}
