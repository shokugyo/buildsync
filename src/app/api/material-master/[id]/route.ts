import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { code, name, unit, unitPrice, category, supplierId, enabled } = body

  const existing = await prisma.materialMaster.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const item = await prisma.materialMaster.update({
    where: { id: params.id },
    data: {
      ...(code !== undefined && { code: code || null }),
      ...(name !== undefined && { name }),
      ...(unit !== undefined && { unit }),
      ...(unitPrice !== undefined && { unitPrice: parseFloat(unitPrice) }),
      ...(category !== undefined && { category: category || null }),
      ...(supplierId !== undefined && { supplierId: supplierId || null }),
      ...(enabled !== undefined && { enabled }),
    },
    include: { supplier: { select: { id: true, name: true } } },
  })

  return NextResponse.json(item)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const existing = await prisma.materialMaster.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  await prisma.materialMaster.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
