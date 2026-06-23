import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const existing = await prisma.inquiry.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { name, email, phone, subject, message, source, status, assignedTo, response, respondedAt, customerId } = body

  const inquiry = await prisma.inquiry.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email: email || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(subject !== undefined && { subject }),
      ...(message !== undefined && { message }),
      ...(source !== undefined && { source }),
      ...(status !== undefined && { status }),
      ...(assignedTo !== undefined && { assignedTo: assignedTo || null }),
      ...(response !== undefined && { response: response || null }),
      ...(respondedAt !== undefined && { respondedAt: respondedAt ? new Date(respondedAt) : null }),
      ...(customerId !== undefined && { customerId: customerId || null }),
    },
    include: {
      assignee: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(inquiry)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const existing = await prisma.inquiry.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.inquiry.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
