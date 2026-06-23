import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const userId = (session.user as any).id
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const mine = searchParams.get('mine')

  const where: any = { companyId }
  if (status) where.status = status
  if (mine === 'true') where.requestedBy = userId

  const items = await prisma.advancePayment.findMany({
    where,
    include: {
      requester: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const userId = (session.user as any).id
  const body = await req.json()
  const { purpose, amount, projectId } = body

  if (!purpose) return NextResponse.json({ error: '目的は必須です' }, { status: 400 })
  if (!amount) return NextResponse.json({ error: '金額は必須です' }, { status: 400 })

  const item = await prisma.advancePayment.create({
    data: {
      purpose,
      amount: parseFloat(amount),
      projectId: projectId || null,
      requestedBy: userId,
      companyId,
    },
    include: {
      requester: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(item, { status: 201 })
}
