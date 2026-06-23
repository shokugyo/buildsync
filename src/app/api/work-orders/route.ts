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

  const workOrders = await prisma.workOrder.findMany({
    where: {
      companyId,
      ...(status && { status }),
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      assignee: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(workOrders)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { projectId, title, description, assignedTo, dueDate, status, priority } = body

  if (!projectId || !title) {
    return NextResponse.json({ error: '案件とタイトルは必須です' }, { status: 400 })
  }

  const count = await prisma.workOrder.count({ where: { companyId } })
  const orderNumber = `WO-${String(count + 1).padStart(3, '0')}`

  const workOrder = await prisma.workOrder.create({
    data: {
      orderNumber,
      projectId,
      title,
      description: description || null,
      assignedTo: assignedTo || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: status || '未着手',
      priority: priority || '中',
      companyId,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      assignee: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(workOrder, { status: 201 })
}
