import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { sendNotification } from '@/lib/notify'
import { dispatchWebhook } from '@/lib/webhook'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const customerId = searchParams.get('customerId') || ''
  const managerId = searchParams.get('managerId') || ''
  const salesId = searchParams.get('salesId') || ''
  const workType = searchParams.get('workType') || ''
  const startDateFrom = searchParams.get('startDateFrom') || ''
  const startDateTo = searchParams.get('startDateTo') || ''
  const endDateFrom = searchParams.get('endDateFrom') || ''
  const endDateTo = searchParams.get('endDateTo') || ''

  const userRole = (session.user as any).role as string
  const companyId = session.user.companyId
  const userId = (session.user as any).id as string

  const isSupplier = userRole === '協力会社' || userRole === '協力会社管理者'

  const where: any = {
    companyId,
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search } },
        { projectNumber: { contains: search } },
      ],
    }),
    ...(status ? { status } : { NOT: { status: 'アーカイブ' } }),
    ...(customerId && { customerId }),
    ...(managerId && { managerId }),
    ...(salesId && { salesId }),
    ...(workType && { workType }),
    ...(startDateFrom && startDateTo && { startDate: { gte: new Date(startDateFrom), lte: new Date(startDateTo) } }),
    ...(startDateFrom && !startDateTo && { startDate: { gte: new Date(startDateFrom) } }),
    ...(!startDateFrom && startDateTo && { startDate: { lte: new Date(startDateTo) } }),
    ...(endDateFrom && endDateTo && { endDate: { gte: new Date(endDateFrom), lte: new Date(endDateTo) } }),
    ...(endDateFrom && !endDateTo && { endDate: { gte: new Date(endDateFrom) } }),
    ...(!endDateFrom && endDateTo && { endDate: { lte: new Date(endDateTo) } }),
  }

  if (isSupplier) {
    const userSuppliers = await prisma.supplier.findMany({
      where: { companyId },
      select: { id: true },
    })
    const supplierIds = userSuppliers.map((s) => s.id)

    const orderProjectIds = await prisma.order.findMany({
      where: { supplierId: { in: supplierIds } },
      select: { projectId: true },
    })
    const allowedProjectIds = Array.from(new Set(orderProjectIds.map((o) => o.projectId)))

    const memberProjectIds = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    })
    const allAllowedIds = Array.from(new Set([...allowedProjectIds, ...memberProjectIds.map((m) => m.projectId)]))

    where.id = { in: allAllowedIds }
  }

  const projects = await prisma.project.findMany({
    where,
    include: {
      customer: true,
      manager: true,
      sales: true,
      company: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Hide cost/financial fields from non-financial roles
  const canSeeCosts = ['管理者', '会社管理者', '部門長', '経営者', '経理・事務'].includes(userRole)
  if (!canSeeCosts) {
    const sanitized = projects.map((p) => ({
      ...p,
      contractAmount: null,
      estimatedCost: null,
    }))
    return NextResponse.json(sanitized)
  }

  return NextResponse.json(projects)
}

// Bulk status update: PATCH /api/projects { ids: string[], status: string }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { ids, status } = body
  if (!Array.isArray(ids) || ids.length === 0 || !status) {
    return NextResponse.json({ error: 'ids と status は必須です' }, { status: 400 })
  }

  const companyId = session.user.companyId
  const result = await prisma.project.updateMany({
    where: { id: { in: ids }, companyId, deletedAt: null },
    data: { status },
  })

  await logAudit({
    userId: (session.user as any).id,
    userName: (session.user as any).name || session.user.email || '',
    action: 'BULK_UPDATE',
    target: '案件',
    targetId: ids.join(','),
    detail: `ステータス一括変更: ${status}（${ids.length}件）`,
    companyId,
  })

  return NextResponse.json({ updated: result.count })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()

  // Generate project number
  const count = await prisma.project.count({ where: { companyId: session.user.companyId } })
  const projectNumber = `P-${String(count + 1).padStart(3, '0')}`

  const project = await prisma.project.create({
    data: {
      projectNumber,
      name: body.name,
      status: body.status || '引合',
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
      notes: body.notes || null,
      companyId: session.user.companyId,
    },
  })

  // N-001: 案件登録通知
  const notifyIds: string[] = [body.managerId, body.salesId].filter((id): id is string => !!id && id !== (session.user as any).id)
  for (const uid of notifyIds) {
    await sendNotification({
      userId: uid,
      title: '新しい案件が担当に追加されました',
      content: `案件「${project.name}」（${project.projectNumber}）が登録されました`,
      type: 'project',
      link: `/projects/${project.id}`,
    })
  }

  await logAudit({
    userId: (session.user as any).id,
    userName: (session.user as any).name || session.user.email || '',
    action: 'CREATE',
    target: '案件',
    targetId: project.id,
    detail: project.name,
    companyId: session.user.companyId,
  })

  await dispatchWebhook(session.user.companyId, 'project.created', { id: project.id, name: project.name, projectNumber: project.projectNumber, status: project.status })

  return NextResponse.json(project, { status: 201 })
}
