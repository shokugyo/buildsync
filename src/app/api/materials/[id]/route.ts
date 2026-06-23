import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { name, unit, quantity, unitPrice, supplierId, projectId, scheduledAt, deliveredAt, notes, status } = body

  const existing = await prisma.material.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const material = await prisma.material.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(unit !== undefined && { unit }),
      ...(quantity !== undefined && { quantity: parseFloat(quantity) }),
      ...(unitPrice !== undefined && { unitPrice: unitPrice ? parseFloat(unitPrice) : null }),
      ...(supplierId !== undefined && { supplierId: supplierId || null }),
      ...(projectId !== undefined && { projectId }),
      ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
      ...(deliveredAt !== undefined && { deliveredAt: deliveredAt ? new Date(deliveredAt) : null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(status !== undefined && { status }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      supplier: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(material)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const existing = await prisma.material.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  await prisma.material.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
