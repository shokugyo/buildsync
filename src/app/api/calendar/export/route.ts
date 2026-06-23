import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function formatICalDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function buildVEvent(uid: string, summary: string, dtstart: Date, dtend: Date, description?: string): string {
  const start = formatICalDate(dtstart)
  // For all-day events, DTEND is the day after
  const endDate = new Date(dtend)
  endDate.setUTCDate(endDate.getUTCDate() + 1)
  const end = formatICalDate(endDate)

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SUMMARY:${escapeICalText(summary)}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
  ]
  if (description) {
    lines.push(`DESCRIPTION:${escapeICalText(description)}`)
  }
  lines.push('END:VEVENT')
  return lines.join('\r\n')
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  const projectFilter = {
    companyId,
    ...(projectId ? { id: projectId } : {}),
  }

  // Fetch project schedules
  const schedules = await prisma.schedule.findMany({
    where: {
      project: projectFilter,
    },
    include: {
      project: { select: { name: true, projectNumber: true } },
    },
  })

  // Fetch tasks with due dates
  const tasks = await prisma.task.findMany({
    where: {
      companyId,
      dueDate: { not: null },
      ...(projectId ? { projectId } : {}),
    },
    include: {
      project: { select: { name: true } },
    },
  })

  // Fetch inspections with scheduled dates
  const inspections = await prisma.inspection.findMany({
    where: {
      project: projectFilter,
      scheduledDate: { not: null },
    },
    include: {
      project: { select: { name: true, projectNumber: true } },
    },
  })

  const vEvents: string[] = []

  // Add schedule events
  for (const s of schedules) {
    const summary = `[工程] ${s.project.projectNumber} ${s.name}`
    const description = s.notes || undefined
    vEvents.push(buildVEvent(
      `schedule-${s.id}@buildsync`,
      summary,
      new Date(s.startDate),
      new Date(s.endDate),
      description,
    ))
  }

  // Add task events (single-day)
  for (const t of tasks) {
    if (!t.dueDate) continue
    const projectLabel = t.project ? ` [${t.project.name}]` : ''
    const summary = `[タスク]${projectLabel} ${t.title}`
    const description = t.description || undefined
    vEvents.push(buildVEvent(
      `task-${t.id}@buildsync`,
      summary,
      new Date(t.dueDate),
      new Date(t.dueDate),
      description,
    ))
  }

  // Add inspection events
  for (const i of inspections) {
    if (!i.scheduledDate) continue
    const summary = `[検査] ${i.project.projectNumber} ${i.name}`
    const description = i.notes || undefined
    vEvents.push(buildVEvent(
      `inspection-${i.id}@buildsync`,
      summary,
      new Date(i.scheduledDate),
      new Date(i.scheduledDate),
      description,
    ))
  }

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BuildSync//BuildSync//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...vEvents,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ical, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="buildsync.ics"',
    },
  })
}
