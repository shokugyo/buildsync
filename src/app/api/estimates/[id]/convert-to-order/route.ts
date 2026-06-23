import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  // Fetch estimate with items
  const estimate = await prisma.estimate.findFirst({
    where: { id: params.id, companyId },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  if (!estimate) {
    return NextResponse.json({ error: '見積が見つかりません' }, { status: 404 })
  }

  // Only approved estimates can be converted
  if (estimate.status !== '承認済' && estimate.status !== '受注') {
    return NextResponse.json(
      { error: '承認済または受注の見積のみ発注変換できます' },
      { status: 400 }
    )
  }

  // Generate order number
  const count = await prisma.order.count({ where: { companyId } })
  const orderNumber = `ORD-${String(count + 1).padStart(3, '0')}`

  // Calculate amounts from estimate
  const amount = estimate.amount
  const taxAmount = estimate.taxAmount
  const totalAmount = estimate.totalAmount

  // Create order
  const order = await prisma.order.create({
    data: {
      projectId: estimate.projectId,
      supplierId: null,
      orderNumber,
      subject: estimate.project.name,
      orderDate: new Date(),
      amount,
      taxAmount,
      totalAmount,
      status: '承認待ち',
      notes: `見積書 ${estimate.estimateNumber} から変換`,
      companyId,
      items: {
        create: estimate.items.map((item, idx) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          sortOrder: idx,
        })),
      },
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      supplier: { select: { id: true, name: true } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })

  return NextResponse.json(order, { status: 201 })
}
