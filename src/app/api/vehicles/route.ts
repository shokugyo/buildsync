import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const projectId = searchParams.get('projectId')

  const where: any = { companyId }
  if (status) where.status = status
  if (projectId) where.projectId = projectId

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      driver: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(vehicles)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const {
    name, plateNumber, vehicleType, status, projectId, assignedTo,
    lastInspectedAt, nextInspectionAt, mileage, fuelType, notes,
  } = body

  if (!name) return NextResponse.json({ error: '車両名は必須です' }, { status: 400 })
  if (!plateNumber) return NextResponse.json({ error: 'ナンバーは必須です' }, { status: 400 })
  if (!vehicleType) return NextResponse.json({ error: '種別は必須です' }, { status: 400 })

  const vehicle = await prisma.vehicle.create({
    data: {
      name,
      plateNumber,
      vehicleType,
      status: status || '利用可能',
      projectId: projectId || null,
      assignedTo: assignedTo || null,
      lastInspectedAt: lastInspectedAt ? new Date(lastInspectedAt) : null,
      nextInspectionAt: nextInspectionAt ? new Date(nextInspectionAt) : null,
      mileage: mileage ? parseInt(mileage) : null,
      fuelType: fuelType || null,
      notes: notes || null,
      companyId,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
      driver: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(vehicle, { status: 201 })
}
