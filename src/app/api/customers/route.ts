import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const customers = await prisma.customer.findMany({
    where: { companyId: session.user.companyId, deletedAt: null },
    include: { _count: { select: { projects: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(customers)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()

  const customer = await prisma.customer.create({
    data: {
      name: body.name,
      type: body.type || '個人',
      address: body.address || null,
      phone: body.phone || null,
      email: body.email || null,
      companyId: session.user.companyId,
    },
  })

  return NextResponse.json(customer, { status: 201 })
}
