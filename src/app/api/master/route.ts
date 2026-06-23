import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  const items = await prisma.masterItem.findMany({
    where: {
      companyId,
      ...(type ? { type } : {}),
    },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { type, value, label, sortOrder } = body

  if (!type || !value || !label) {
    return NextResponse.json({ error: 'type, value, label are required' }, { status: 400 })
  }

  const item = await prisma.masterItem.create({
    data: {
      type,
      value,
      label,
      sortOrder: sortOrder ?? 0,
      companyId,
    },
  })

  return NextResponse.json(item, { status: 201 })
}
