import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, companyId: (session.user as any).companyId },
    include: {
      customer: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
  })

  if (!lead) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  return NextResponse.json(lead)
}

async function updateLead(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const {
    title, companyName, contactName, contactEmail, phone,
    customerId, customerName, status, source, estimatedAmount,
    assigneeId, contactDate, nextActionDate, notes,
  } = body

  const lead = await prisma.lead.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(companyName !== undefined && { companyName: companyName || null }),
      ...(contactName !== undefined && { contactName: contactName || null }),
      ...(contactEmail !== undefined && { contactEmail: contactEmail || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(customerId !== undefined && { customerId: customerId || null }),
      ...(customerName !== undefined && { customerName: customerName || null }),
      ...(status !== undefined && { status }),
      ...(source !== undefined && { source: source || null }),
      ...(estimatedAmount !== undefined && { estimatedAmount: estimatedAmount ? Number(estimatedAmount) : null }),
      ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
      ...(contactDate !== undefined && { contactDate: contactDate ? new Date(contactDate) : null }),
      ...(nextActionDate !== undefined && { nextActionDate: nextActionDate ? new Date(nextActionDate) : null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
    include: {
      customer: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(lead)
}

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  return updateLead(req, context)
}

export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  return updateLead(req, context)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  await prisma.lead.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
