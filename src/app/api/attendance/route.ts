import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const attendances = await prisma.workerAttendance.findMany({
    where: {
      companyId: (session.user as any).companyId,
      ...(projectId && { projectId }),
      ...(dateFrom || dateTo ? {
        workDate: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo + 'T23:59:59') }),
        },
      } : {}),
    },
    include: { project: { select: { name: true, projectNumber: true } } },
    orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(attendances)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { projectId, workerName, company, workDate, entryTime, exitTime, workContent, notes, workingHours, overtimeHours } = body

  if (!projectId || !workerName || !workDate) {
    return NextResponse.json({ error: '案件・作業員名・作業日は必須です' }, { status: 400 })
  }

  const attendance = await prisma.workerAttendance.create({
    data: {
      projectId,
      workerName,
      company: company || null,
      workDate: new Date(workDate),
      entryTime: entryTime || null,
      exitTime: exitTime || null,
      workContent: workContent || null,
      notes: notes || null,
      workingHours: workingHours != null ? Number(workingHours) : null,
      overtimeHours: overtimeHours != null ? Number(overtimeHours) : null,
      companyId: (session.user as any).companyId,
    },
    include: { project: { select: { name: true, projectNumber: true } } },
  })

  return NextResponse.json(attendance, { status: 201 })
}
