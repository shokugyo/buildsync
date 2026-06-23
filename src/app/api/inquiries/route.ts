import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const customerId = searchParams.get('customerId')

  const where: any = { companyId }
  if (status) where.status = status
  if (customerId) where.customerId = customerId

  const inquiries = await prisma.inquiry.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(inquiries)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { name, email, phone, subject, message, source, status, assignedTo, customerId } = body

  if (!name) return NextResponse.json({ error: '氏名は必須です' }, { status: 400 })
  if (!subject) return NextResponse.json({ error: '件名は必須です' }, { status: 400 })
  if (!message) return NextResponse.json({ error: '内容は必須です' }, { status: 400 })

  const inquiry = await prisma.inquiry.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      subject,
      message,
      source: source || '問い合わせフォーム',
      status: status || '未対応',
      assignedTo: assignedTo || null,
      customerId: customerId || null,
      companyId,
    },
    include: {
      assignee: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(inquiry, { status: 201 })
}
