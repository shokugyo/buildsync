import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { id } = params

  const existing = await prisma.materialOrder.findFirst({ where: { id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const body = await req.json()
  const {
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

  const qty = quantity != null ? parseFloat(quantity) : existing.quantity
  const uPrice = unitPrice !== undefined ? (unitPrice != null ? parseFloat(unitPrice) : null) : existing.unitPrice
  const computedTotal =
    totalAmount !== undefined
      ? totalAmount != null ? parseFloat(totalAmount) : null
      : uPrice != null
      ? qty * uPrice
      : existing.totalAmount

  const updated = await prisma.materialOrder.update({
    where: { id },
    data: {
      name: name ?? existing.name,
      quantity: qty,
      unit: unit ?? existing.unit,
      unitPrice: uPrice,
      totalAmount: computedTotal,
      orderedAt: orderedAt !== undefined ? (orderedAt ? new Date(orderedAt) : null) : existing.orderedAt,
      deliveredAt: deliveredAt !== undefined ? (deliveredAt ? new Date(deliveredAt) : null) : existing.deliveredAt,
      supplier: supplier !== undefined ? supplier || null : existing.supplier,
      status: status ?? existing.status,
      notes: notes !== undefined ? notes || null : existing.notes,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { id } = params

  const existing = await prisma.materialOrder.findFirst({ where: { id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  await prisma.materialOrder.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
