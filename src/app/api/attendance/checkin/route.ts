import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { projectId, workerName, company, workDate, entryTime, exitTime } = await req.json()
  if (!projectId || !workerName) return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, companyId: true } })
  if (!project) return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })

  // Find existing attendance record for today
  const existing = await prisma.workerAttendance.findFirst({
    where: { projectId, workerName, workDate: new Date(workDate) },
  })

  if (existing) {
    // Update existing record (add exit time)
    const updated = await prisma.workerAttendance.update({
      where: { id: existing.id },
      data: { ...(exitTime && { exitTime }), ...(entryTime && { entryTime }) },
    })
    return NextResponse.json(updated)
  } else {
    // Create new record
    const attendance = await prisma.workerAttendance.create({
      data: {
        projectId,
        workerName,
        company: company || null,
        workDate: new Date(workDate),
        entryTime: entryTime || null,
        exitTime: exitTime || null,
        companyId: project.companyId,
      },
    })
    return NextResponse.json(attendance)
  }
}
