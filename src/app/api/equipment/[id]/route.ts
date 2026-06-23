import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { name, type, serialNumber, status, projectId, assignedFrom, assignedTo, lastInspectedAt, nextInspectionAt, notes } = body

  const existing = await prisma.equipment.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const equipment = await prisma.equipment.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(serialNumber !== undefined && { serialNumber: serialNumber || null }),
      ...(status !== undefined && { status }),
      ...(projectId !== undefined && { projectId: projectId || null }),
      ...(assignedFrom !== undefined && { assignedFrom: assignedFrom ? new Date(assignedFrom) : null }),
      ...(assignedTo !== undefined && { assignedTo: assignedTo ? new Date(assignedTo) : null }),
      ...(lastInspectedAt !== undefined && { lastInspectedAt: lastInspectedAt ? new Date(lastInspectedAt) : null }),
      ...(nextInspectionAt !== undefined && { nextInspectionAt: nextInspectionAt ? new Date(nextInspectionAt) : null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(equipment)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const existing = await prisma.equipment.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  await prisma.equipment.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
