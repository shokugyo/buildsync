import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const restrictions = await prisma.ipRestriction.findMany({
    where: { companyId },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(restrictions)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { cidr, description, enabled } = await req.json()

  if (!cidr) {
    return NextResponse.json({ error: 'CIDRは必須です' }, { status: 400 })
  }

  const restriction = await prisma.ipRestriction.create({
    data: {
      cidr,
      description: description ?? null,
      enabled: enabled ?? true,
      companyId,
    },
  })

  return NextResponse.json(restriction, { status: 201 })
}
