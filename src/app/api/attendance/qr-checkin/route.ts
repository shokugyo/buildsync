import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { qrData, type } = body

  if (!qrData || !type) {
    return NextResponse.json({ error: 'qrData と type は必須です' }, { status: 400 })
  }
  if (type !== 'in' && type !== 'out') {
    return NextResponse.json({ error: 'type は "in" または "out" である必要があります' }, { status: 400 })
  }

  // Parse BUILDSYNC:userId:projectId format
  const parts = String(qrData).trim().split(':')
  if (parts.length !== 3 || parts[0] !== 'BUILDSYNC') {
    return NextResponse.json({ error: 'QRコードの形式が正しくありません（BUILDSYNC:userId:projectId）' }, { status: 400 })
  }
  const [, userId, projectId] = parts

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, projectNumber: true, companyId: true },
  })
  if (!project) return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  })
  const workerName = user?.name || userId

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
  const timeStr = now.toTimeString().slice(0, 5)

  const existing = await prisma.workerAttendance.findFirst({
    where: {
      projectId,
      workerName,
      workDate: { gte: todayStart, lte: todayEnd },
      companyId: project.companyId,
    },
  })

  if (type === 'in') {
    if (existing?.entryTime) {
      return NextResponse.json({
        message: '本日はすでに入場記録があります',
        attendance: existing,
        workerName,
        projectName: project.name,
      })
    }

    if (existing) {
      const updated = await prisma.workerAttendance.update({
        where: { id: existing.id },
        data: { entryTime: timeStr, checkInMethod: 'qr' },
        include: { project: { select: { name: true, projectNumber: true } } },
      })
      return NextResponse.json({ message: '入場を記録しました', attendance: updated, workerName, projectName: project.name })
    }

    const attendance = await prisma.workerAttendance.create({
      data: {
        projectId,
        workerName,
        workDate: todayStart,
        entryTime: timeStr,
        checkInMethod: 'qr',
        companyId: project.companyId,
      },
      include: { project: { select: { name: true, projectNumber: true } } },
    })
    return NextResponse.json({ message: '入場を記録しました', attendance, workerName, projectName: project.name }, { status: 201 })
  }

  if (type === 'out') {
    if (!existing) {
      return NextResponse.json({ error: '本日の入場記録がありません。先に入場スキャンを行ってください。' }, { status: 400 })
    }

    let workingHours: number | null = null
    if (existing.entryTime && timeStr) {
      const [eh, em] = existing.entryTime.split(':').map(Number)
      const [xh, xm] = timeStr.split(':').map(Number)
      const diffMinutes = xh * 60 + xm - (eh * 60 + em)
      if (diffMinutes > 0) {
        workingHours = Math.round((diffMinutes / 60) * 100) / 100
      }
    }

    const updated = await prisma.workerAttendance.update({
      where: { id: existing.id },
      data: { exitTime: timeStr, workingHours, checkOutMethod: 'qr' },
      include: { project: { select: { name: true, projectNumber: true } } },
    })
    return NextResponse.json({ message: '退場を記録しました', attendance: updated, workerName, projectName: project.name })
  }
}
