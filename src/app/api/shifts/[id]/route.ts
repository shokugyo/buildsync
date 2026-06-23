import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()

  const existing = await prisma.shift.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const data: any = {}
  if (body.startTime !== undefined) data.startTime = body.startTime
  if (body.endTime !== undefined) data.endTime = body.endTime
  if (body.projectId !== undefined) data.projectId = body.projectId || null
  if (body.role !== undefined) data.role = body.role || null
  if (body.notes !== undefined) data.notes = body.notes || null
  if (body.date !== undefined) data.date = new Date(body.date)

  const shift = await prisma.shift.update({
    where: { id: params.id },
    data,
    include: {
      user: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(shift)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const existing = await prisma.shift.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  await prisma.shift.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
