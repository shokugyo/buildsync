import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')

  const where: any = { companyId }
  if (projectId) where.projectId = projectId
  if (status) where.status = status

  const orders = await prisma.materialOrder.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(orders)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const {
    projectId,
    name,
    quantity,
    unit,
    unitPrice,
    totalAmount,
    orderedAt,
    deliveredAt,
    supplier,
    status,
    notes,
  } = body

  if (!name) return NextResponse.json({ error: '資材名は必須です' }, { status: 400 })
  if (!projectId) return NextResponse.json({ error: '案件は必須です' }, { status: 400 })
  if (!quantity) return NextResponse.json({ error: '数量は必須です' }, { status: 400 })

  const qty = parseFloat(quantity)
  const uPrice = unitPrice != null ? parseFloat(unitPrice) : null
  const computedTotal = totalAmount != null
    ? parseFloat(totalAmount)
    : uPrice != null
    ? qty * uPrice
    : null

  const order = await prisma.materialOrder.create({
    data: {
      projectId,
      name,
      quantity: qty,
      unit: unit || '個',
      unitPrice: uPrice,
      totalAmount: computedTotal,
      orderedAt: orderedAt ? new Date(orderedAt) : null,
      deliveredAt: deliveredAt ? new Date(deliveredAt) : null,
      supplier: supplier || null,
      status: status || '未発注',
      notes: notes || null,
      companyId,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(order, { status: 201 })
}
