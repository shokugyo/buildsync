import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // optional filter

  const corrections = await prisma.attendanceCorrection.findMany({
    where: {
      companyId: (session.user as any).companyId,
      ...(status ? { status } : {}),
    },
    include: {
      attendance: {
        include: {
          project: { select: { name: true, projectNumber: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(corrections)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { attendanceId, requestedCheckIn, requestedCheckOut, reason } = body

  if (!attendanceId || !reason) {
    return NextResponse.json({ error: '入退場記録IDと理由は必須です' }, { status: 400 })
  }

  // Verify the attendance belongs to this company
  const attendance = await prisma.workerAttendance.findFirst({
    where: {
      id: attendanceId,
      companyId: (session.user as any).companyId,
    },
  })

  if (!attendance) {
    return NextResponse.json({ error: '入退場記録が見つかりません' }, { status: 404 })
  }

  const correction = await prisma.attendanceCorrection.create({
    data: {
      attendanceId,
      requestedCheckIn: requestedCheckIn || null,
      requestedCheckOut: requestedCheckOut || null,
      reason,
      status: '申請中',
      companyId: (session.user as any).companyId,
    },
    include: {
      attendance: {
        include: {
          project: { select: { name: true, projectNumber: true } },
        },
      },
    },
  })

  return NextResponse.json(correction, { status: 201 })
}
