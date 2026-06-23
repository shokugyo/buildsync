import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const existing = await prisma.ipRestriction.findFirst({
    where: { id: params.id, companyId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { cidr, description, enabled } = body

  const updated = await prisma.ipRestriction.update({
    where: { id: params.id },
    data: {
      ...(cidr !== undefined && { cidr }),
      ...(description !== undefined && { description }),
      ...(enabled !== undefined && { enabled }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const existing = await prisma.ipRestriction.findFirst({
    where: { id: params.id, companyId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.ipRestriction.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
