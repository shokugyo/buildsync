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

  const existing = await prisma.leaveRequest.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const data: any = {}
  if (body.status !== undefined) {
    data.status = body.status
    if (body.status === '承認' || body.status === '却下') {
      data.approvedBy = userId
      data.approvedAt = new Date()
    }
  }

  const leaveRequest = await prisma.leaveRequest.update({
    where: { id: params.id },
    data,
    include: {
      user: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(leaveRequest)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const existing = await prisma.leaveRequest.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  await prisma.leaveRequest.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
