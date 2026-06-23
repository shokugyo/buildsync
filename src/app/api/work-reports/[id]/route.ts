import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const report = await prisma.workReport.findFirst({
    where: { id: params.id, companyId },
    include: {
      reporter: { select: { id: true, name: true, company: { select: { name: true } } } },
      approver: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true, address: true } },
    },
  })

  if (!report) return NextResponse.json({ error: '報告が見つかりません' }, { status: 404 })
  return NextResponse.json(report)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { location, content, photoIds, reportDate, action, rejectReason, workerCount, workHours, weather, materials, equipment, nextDayPlan, comment } = body
  const userId = (session.user as any).id

  let updateData: any = {}

  if (action === 'approve') {
    updateData = { status: '承認済', approvedBy: userId, approvedAt: new Date(), rejectReason: null }
  } else if (action === 'reject') {
    updateData = { status: '差し戻し', rejectReason: rejectReason || null, approvedBy: userId, approvedAt: new Date() }
  } else {
    if (location !== undefined) updateData.location = location || null
    if (content !== undefined) updateData.content = content
    if (photoIds !== undefined) updateData.photoIds = JSON.stringify(photoIds)
    if (reportDate !== undefined) updateData.reportDate = new Date(reportDate)
    if (workerCount !== undefined) updateData.workerCount = workerCount !== '' && workerCount !== null ? Number(workerCount) : null
    if (workHours !== undefined) updateData.workHours = workHours !== '' && workHours !== null ? Number(workHours) : null
    if (weather !== undefined) updateData.weather = weather || null
    if (materials !== undefined) updateData.materials = materials || null
    if (equipment !== undefined) updateData.equipment = equipment || null
    if (nextDayPlan !== undefined) updateData.nextDayPlan = nextDayPlan || null
    if (comment !== undefined) updateData.comment = comment || null
  }

  const report = await prisma.workReport.update({
    where: { id: params.id },
    data: updateData,
    include: {
      reporter: { select: { id: true, name: true, company: { select: { name: true } } } },
      approver: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(report)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { location, content, photoIds, reportDate, workerCount, workHours, weather, materials, equipment, nextDayPlan, comment } = body

  const report = await prisma.workReport.update({
    where: { id: params.id },
    data: {
      ...(location !== undefined && { location: location || null }),
      ...(content !== undefined && { content }),
      ...(photoIds !== undefined && { photoIds: JSON.stringify(photoIds) }),
      ...(reportDate !== undefined && { reportDate: new Date(reportDate) }),
      ...(workerCount !== undefined && { workerCount: workerCount !== '' && workerCount !== null ? Number(workerCount) : null }),
      ...(workHours !== undefined && { workHours: workHours !== '' && workHours !== null ? Number(workHours) : null }),
      ...(weather !== undefined && { weather: weather || null }),
      ...(materials !== undefined && { materials: materials || null }),
      ...(equipment !== undefined && { equipment: equipment || null }),
      ...(nextDayPlan !== undefined && { nextDayPlan: nextDayPlan || null }),
      ...(comment !== undefined && { comment: comment || null }),
    },
    include: {
      reporter: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(report)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const report = await prisma.workReport.findFirst({
    where: { id: params.id, companyId },
  })

  if (!report) {
    return NextResponse.json({ error: '報告が見つかりません' }, { status: 404 })
  }

  await prisma.workReport.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
