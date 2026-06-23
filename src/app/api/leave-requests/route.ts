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
  const mine = searchParams.get('mine')

  const where: any = { companyId }
  if (mine === 'true') where.userId = userId

  const leaveRequests = await prisma.leaveRequest.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(leaveRequests)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const userId = (session.user as any).id
  const body = await req.json()
  const { leaveType, startDate, endDate, days, reason } = body

  if (!startDate) return NextResponse.json({ error: '開始日は必須です' }, { status: 400 })
  if (!endDate) return NextResponse.json({ error: '終了日は必須です' }, { status: 400 })
  if (!days) return NextResponse.json({ error: '日数は必須です' }, { status: 400 })

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      userId,
      leaveType: leaveType || '有給',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      days: parseFloat(days),
      reason: reason || null,
      companyId,
    },
    include: {
      user: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(leaveRequest, { status: 201 })
}
