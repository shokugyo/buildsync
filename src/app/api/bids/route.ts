import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const bids = await prisma.bid.findMany({
    where: {
      companyId: (session.user as any).companyId,
      ...(status && { status }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(bids)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const {
    title, projectId, bidDate, submissionDeadline,
    estimatedAmount, bidAmount, status, result,
    competitors, notes,
  } = body

  if (!title) return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 })
  if (!bidDate) return NextResponse.json({ error: '入札日は必須です' }, { status: 400 })

  const companyId = (session.user as any).companyId

  const bid = await prisma.bid.create({
    data: {
      title,
      projectId: projectId || null,
      bidDate: new Date(bidDate),
      submissionDeadline: submissionDeadline ? new Date(submissionDeadline) : null,
      estimatedAmount: estimatedAmount ? Number(estimatedAmount) : null,
      bidAmount: bidAmount ? Number(bidAmount) : null,
      status: status || '準備中',
      result: result || null,
      competitors: competitors ? Number(competitors) : 0,
      notes: notes || null,
      companyId,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(bid, { status: 201 })
}
