import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyProjectMembers } from '@/lib/notify'
import { dispatchWebhook } from '@/lib/webhook'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
    include: {
      customer: true,
      manager: true,
      sales: true,
      schedules: { include: { assignee: true }, orderBy: { startDate: 'asc' } },
      photos: { include: { uploader: true }, orderBy: { createdAt: 'desc' } },
      chatRooms: { include: { messages: { include: { sender: true }, orderBy: { createdAt: 'asc' } } } },
      inspections: { include: { items: true, inspector: true, defects: true } },
      orders: { orderBy: { createdAt: 'desc' } },
      invoices: { include: { customer: true }, orderBy: { createdAt: 'desc' } },
      budgets: true,
      reports: { include: { reporter: true }, orderBy: { workDate: 'desc' } },
      defects: { include: { assignee: true }, orderBy: { createdAt: 'desc' } },
    },
  })

  if (!project) return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })

  return NextResponse.json(project)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()

  const existing = await prisma.project.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
    select: { status: true, name: true },
  })

  await prisma.project.updateMany({
    where: { id: params.id, companyId: session.user.companyId },
    data: {
      name: body.name,
      status: body.status,
      customerId: body.customerId || null,
      address: body.address || null,
      workType: body.workType || null,
      managerId: body.managerId || null,
      salesId: body.salesId || null,
      contractAmount: body.contractAmount ? parseFloat(body.contractAmount) : null,
      estimatedCost: body.estimatedCost ? parseFloat(body.estimatedCost) : null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
      ridgepoleDate: body.ridgepoleDate ? new Date(body.ridgepoleDate) : null,
      notes: body.notes || null,
      cautions: body.cautions !== undefined ? (body.cautions || null) : undefined,
      siteEmergencyContact: body.siteEmergencyContact !== undefined ? (body.siteEmergencyContact || null) : undefined,
      siteEmergencyPhone: body.siteEmergencyPhone !== undefined ? (body.siteEmergencyPhone || null) : undefined,
      propertyType: body.propertyType || null,
      propertyName: body.propertyName || null,
      propertyNameKana: body.propertyNameKana || null,
      labels: body.labels || null,
    },
  })

  // N-002: 案件ステータス変更通知
  if (existing && body.status && existing.status !== body.status) {
    await notifyProjectMembers({
      projectId: params.id,
      excludeUserId: (session.user as any).id,
      title: '案件ステータスが変更されました',
      content: `「${existing.name}」のステータスが「${existing.status}」から「${body.status}」に変更されました`,
      type: 'project_status',
      link: `/projects/${params.id}`,
    })
  }

  await dispatchWebhook(session.user.companyId, 'project.updated', { id: params.id, name: body.name, status: body.status })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  await prisma.project.updateMany({
    where: { id: params.id, companyId: session.user.companyId },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
