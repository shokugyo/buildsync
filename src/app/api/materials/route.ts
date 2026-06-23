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

  const materials = await prisma.material.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      supplier: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(materials)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { name, unit, quantity, unitPrice, supplierId, projectId, scheduledAt, notes, status } = body

  if (!name) return NextResponse.json({ error: '材料名は必須です' }, { status: 400 })
  if (!unit) return NextResponse.json({ error: '単位は必須です' }, { status: 400 })
  if (!quantity) return NextResponse.json({ error: '数量は必須です' }, { status: 400 })
  if (!projectId) return NextResponse.json({ error: '案件は必須です' }, { status: 400 })

  const material = await prisma.material.create({
    data: {
      name,
      unit,
      quantity: parseFloat(quantity),
      unitPrice: unitPrice ? parseFloat(unitPrice) : null,
      supplierId: supplierId || null,
      projectId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      notes: notes || null,
      status: status || '未発注',
      companyId,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      supplier: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(material, { status: 201 })
}
