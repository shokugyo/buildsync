import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const assignedTo = searchParams.get('assignedTo')

  const leads = await prisma.lead.findMany({
    where: {
      companyId: (session.user as any).companyId,
      ...(status && { status }),
      ...(assignedTo && { assigneeId: assignedTo }),
    },
    include: {
      customer: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(leads)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const {
    title, companyName, contactName, contactEmail, phone,
    customerId, customerName, status, source, estimatedAmount,
    assigneeId, contactDate, nextActionDate, notes,
  } = body

  if (!title) {
    return NextResponse.json({ error: '引合タイトルは必須です' }, { status: 400 })
  }

  const lead = await prisma.lead.create({
    data: {
      title,
      companyName: companyName || null,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      phone: phone || null,
      customerId: customerId || null,
      customerName: customerName || null,
      status: status || '新規問い合わせ',
      source: source || null,
      estimatedAmount: estimatedAmount ? Number(estimatedAmount) : null,
      assigneeId: assigneeId || null,
      contactDate: contactDate ? new Date(contactDate) : null,
      nextActionDate: nextActionDate ? new Date(nextActionDate) : null,
      notes: notes || null,
      companyId: (session.user as any).companyId,
    },
    include: {
      customer: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(lead, { status: 201 })
}
