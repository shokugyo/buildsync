import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const enabledParam = searchParams.get('enabled')

  const where: any = { companyId }
  if (category) where.category = category
  if (enabledParam !== null) where.enabled = enabledParam === 'true'
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { category: { contains: search } },
    ]
  }

  const items = await prisma.materialMaster.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true } },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { code, name, unit, unitPrice, category, supplierId, enabled } = body

  if (!name) return NextResponse.json({ error: '材料名は必須です' }, { status: 400 })
  if (!unit) return NextResponse.json({ error: '単位は必須です' }, { status: 400 })
  if (unitPrice === undefined || unitPrice === null) return NextResponse.json({ error: '単価は必須です' }, { status: 400 })

  const item = await prisma.materialMaster.create({
    data: {
      code: code || null,
      name,
      unit,
      unitPrice: parseFloat(unitPrice),
      category: category || null,
      supplierId: supplierId || null,
      enabled: enabled !== false,
      companyId,
    },
    include: {
      supplier: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(item, { status: 201 })
}
