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

  const equipments = await prisma.equipment.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(equipments)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { name, type, serialNumber, status, projectId, assignedFrom, assignedTo, lastInspectedAt, nextInspectionAt, notes } = body

  if (!name) return NextResponse.json({ error: '機器名は必須です' }, { status: 400 })
  if (!type) return NextResponse.json({ error: '種別は必須です' }, { status: 400 })

  const equipment = await prisma.equipment.create({
    data: {
      name,
      type,
      serialNumber: serialNumber || null,
      status: status || '利用可能',
      projectId: projectId || null,
      assignedFrom: assignedFrom ? new Date(assignedFrom) : null,
      assignedTo: assignedTo ? new Date(assignedTo) : null,
      lastInspectedAt: lastInspectedAt ? new Date(lastInspectedAt) : null,
      nextInspectionAt: nextInspectionAt ? new Date(nextInspectionAt) : null,
      notes: notes || null,
      companyId,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(equipment, { status: 201 })
}
