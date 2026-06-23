import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { workerName, company, workDate, entryTime, exitTime, workContent, notes, workingHours, overtimeHours } = body

  const attendance = await prisma.workerAttendance.update({
    where: { id: params.id },
    data: {
      ...(workerName !== undefined && { workerName }),
      ...(company !== undefined && { company: company || null }),
      ...(workDate !== undefined && { workDate: new Date(workDate) }),
      ...(entryTime !== undefined && { entryTime: entryTime || null }),
      ...(exitTime !== undefined && { exitTime: exitTime || null }),
      ...(workContent !== undefined && { workContent: workContent || null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(workingHours !== undefined && { workingHours: workingHours != null ? Number(workingHours) : null }),
      ...(overtimeHours !== undefined && { overtimeHours: overtimeHours != null ? Number(overtimeHours) : null }),
    },
    include: { project: { select: { name: true, projectNumber: true } } },
  })

  return NextResponse.json(attendance)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  await prisma.workerAttendance.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
