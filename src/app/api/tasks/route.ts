import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const projectId = searchParams.get('projectId')
  const assignedTo = searchParams.get('assignedTo')

  const tasks = await prisma.task.findMany({
    where: {
      companyId,
      ...(status && { status }),
      ...(projectId && { projectId }),
      ...(assignedTo && { assignedTo }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      assignee: { select: { id: true, name: true, avatarPath: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const userId = (session.user as any).id
  const body = await req.json()
  const { title, description, projectId, assignedTo, dueDate, priority, status, isRecurring, recurringPattern, recurringEndDate } = body

  if (!title) {
    return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 })
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      projectId: projectId || null,
      assignedTo: assignedTo || null,
      createdBy: userId,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || '中',
      status: status || '未着手',
      companyId,
      isRecurring: isRecurring || false,
      recurringPattern: recurringPattern || null,
      recurringEndDate: recurringEndDate ? new Date(recurringEndDate) : null,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      assignee: { select: { id: true, name: true, avatarPath: true } },
      creator: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(task, { status: 201 })
}
