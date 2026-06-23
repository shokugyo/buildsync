import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()

  const existing = await prisma.vehicle.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const {
    name, plateNumber, vehicleType, status, projectId, assignedTo,
    lastInspectedAt, nextInspectionAt, mileage, fuelType, notes,
  } = body

  const vehicle = await prisma.vehicle.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(plateNumber !== undefined && { plateNumber }),
      ...(vehicleType !== undefined && { vehicleType }),
      ...(status !== undefined && { status }),
      ...(projectId !== undefined && { projectId: projectId || null }),
      ...(assignedTo !== undefined && { assignedTo: assignedTo || null }),
      ...(lastInspectedAt !== undefined && { lastInspectedAt: lastInspectedAt ? new Date(lastInspectedAt) : null }),
      ...(nextInspectionAt !== undefined && { nextInspectionAt: nextInspectionAt ? new Date(nextInspectionAt) : null }),
      ...(mileage !== undefined && { mileage: mileage ? parseInt(mileage) : null }),
      ...(fuelType !== undefined && { fuelType: fuelType || null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      driver: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(vehicle)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const existing = await prisma.vehicle.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.vehicle.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
