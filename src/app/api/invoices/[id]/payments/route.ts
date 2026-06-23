import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } })
  if (!invoice) return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })

  const payments = await prisma.paymentRecord.findMany({
    where: { invoiceId: params.id },
    include: {
      recorder: { select: { id: true, name: true } },
    },
    orderBy: { paidAt: 'desc' },
  })

  return NextResponse.json(payments)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } })
  if (!invoice) return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })

  const body = await req.json()
  const { amount, paidAt, paymentMethod, notes } = body

  if (!amount || !paidAt) {
    return NextResponse.json({ error: 'amount と paidAt は必須です' }, { status: 400 })
  }

  const payment = await prisma.paymentRecord.create({
    data: {
      invoiceId: params.id,
      amount: parseFloat(amount),
      paidAt: new Date(paidAt),
      paymentMethod: paymentMethod || null,
      notes: notes || null,
      recordedBy: (session.user as any).id,
    },
    include: {
      recorder: { select: { id: true, name: true } },
    },
  })

  // Check total paid vs invoice totalAmount, auto-update to 入金済 if fully paid
  const allPayments = await prisma.paymentRecord.findMany({
    where: { invoiceId: params.id },
  })
  const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0)

  if (totalPaid >= invoice.totalAmount) {
    await prisma.invoice.update({
      where: { id: params.id },
      data: {
        status: '入金済',
        paidDate: new Date(paidAt),
      },
    })
  }

  return NextResponse.json(payment, { status: 201 })
}
