import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const userId = (session.user as any).id
  const body = await req.json()

  const existing = await prisma.advancePayment.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const { action } = body
  const data: any = {}

  if (action === 'approve') {
    data.status = '承認済'
    data.approvedBy = userId
    data.approvedAt = new Date()
  } else if (action === 'reject') {
    data.status = '却下'
    data.approvedBy = userId
    data.approvedAt = new Date()
  } else if (action === 'settle') {
    data.status = '精算済'
    data.settledAt = new Date()
  } else {
    if (body.status !== undefined) data.status = body.status
    if (body.purpose !== undefined) data.purpose = body.purpose
    if (body.amount !== undefined) data.amount = parseFloat(body.amount)
    if (body.projectId !== undefined) data.projectId = body.projectId || null
  }

  const item = await prisma.advancePayment.update({
    where: { id: params.id },
    data,
    include: {
      requester: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(item)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const existing = await prisma.advancePayment.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  await prisma.advancePayment.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
