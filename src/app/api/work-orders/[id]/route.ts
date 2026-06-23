import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: params.id, companyId },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      assignee: { select: { id: true, name: true } },
    },
  })

  if (!workOrder) return NextResponse.json({ error: '作業指示書が見つかりません' }, { status: 404 })
  return NextResponse.json(workOrder)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()

  const existing = await prisma.workOrder.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: '作業指示書が見つかりません' }, { status: 404 })

  const completedAt =
    body.status === '完了' && existing.status !== '完了'
      ? new Date()
      : body.status !== '完了'
      ? null
      : existing.completedAt

  const workOrder = await prisma.workOrder.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo || null }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.status !== undefined && { completedAt }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      assignee: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(workOrder)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const existing = await prisma.workOrder.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: '作業指示書が見つかりません' }, { status: 404 })

  await prisma.workOrder.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
