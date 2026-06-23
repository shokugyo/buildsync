import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const templates = await prisma.estimateTemplate.findMany({
    where: { companyId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { name, category, items } = body

  if (!name) return NextResponse.json({ error: 'テンプレート名は必須です' }, { status: 400 })

  const template = await prisma.estimateTemplate.create({
    data: {
      name,
      category: category || null,
      companyId,
      items: {
        create: (items || []).map((it: any, idx: number) => ({
          description: it.description,
          unit: it.unit || null,
          unitPrice: parseFloat(it.unitPrice) || 0,
          quantity: parseFloat(it.quantity) || 1,
          sortOrder: idx,
        })),
      },
    },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  })
  return NextResponse.json(template, { status: 201 })
}
