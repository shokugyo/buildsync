import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const companyId = (session.user as any).companyId
  const { id } = params
  const body = await req.json()
  const { label, value, sortOrder } = body

  const existing = await prisma.masterItem.findFirst({
    where: { id, companyId },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.masterItem.update({
    where: { id },
    data: {
      ...(label !== undefined ? { label } : {}),
      ...(value !== undefined ? { value } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const companyId = (session.user as any).companyId
  const { id } = params

  const existing = await prisma.masterItem.findFirst({
    where: { id, companyId },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.masterItem.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
