import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const bid = await prisma.bid.findFirst({
    where: { id: params.id, companyId: (session.user as any).companyId },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  if (!bid) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  return NextResponse.json(bid)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const {
    title, projectId, bidDate, submissionDeadline,
    estimatedAmount, bidAmount, status, result,
    competitors, notes,
  } = body

  const bid = await prisma.bid.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(projectId !== undefined && { projectId: projectId || null }),
      ...(bidDate !== undefined && { bidDate: new Date(bidDate) }),
      ...(submissionDeadline !== undefined && { submissionDeadline: submissionDeadline ? new Date(submissionDeadline) : null }),
      ...(estimatedAmount !== undefined && { estimatedAmount: estimatedAmount ? Number(estimatedAmount) : null }),
      ...(bidAmount !== undefined && { bidAmount: bidAmount ? Number(bidAmount) : null }),
      ...(status !== undefined && { status }),
      ...(result !== undefined && { result: result || null }),
      ...(competitors !== undefined && { competitors: Number(competitors) }),
      ...(notes !== undefined && { notes: notes || null }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(bid)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  await prisma.bid.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
