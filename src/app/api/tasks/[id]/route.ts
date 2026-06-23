import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { title, description, projectId, assignedTo, dueDate, priority, status, isRecurring, recurringPattern, recurringEndDate } = body

  const existing = await prisma.task.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const task = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(projectId !== undefined && { projectId: projectId || null }),
      ...(assignedTo !== undefined && { assignedTo: assignedTo || null }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(priority !== undefined && { priority }),
      ...(status !== undefined && {
        status,
        completedAt: status === '完了' ? new Date() : null,
      }),
      ...(isRecurring !== undefined && { isRecurring }),
      ...(recurringPattern !== undefined && { recurringPattern: recurringPattern || null }),
      ...(recurringEndDate !== undefined && { recurringEndDate: recurringEndDate ? new Date(recurringEndDate) : null }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      assignee: { select: { id: true, name: true, avatarPath: true } },
      creator: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(task)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const existing = await prisma.task.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.task.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
