import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const user = session.user as any
  if (user.role !== '管理者' && user.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  const body = await req.json()
  const { status } = body

  if (status !== '承認' && status !== '却下') {
    return NextResponse.json({ error: 'statusは「承認」または「却下」を指定してください' }, { status: 400 })
  }

  const correction = await prisma.attendanceCorrection.findFirst({
    where: {
      id: params.id,
      companyId: user.companyId,
    },
  })

  if (!correction) {
    return NextResponse.json({ error: '修正申請が見つかりません' }, { status: 404 })
  }

  if (correction.status !== '申請中') {
    return NextResponse.json({ error: 'すでに処理済みの申請です' }, { status: 400 })
  }

  const updated = await prisma.attendanceCorrection.update({
    where: { id: params.id },
    data: {
      status,
      reviewedBy: user.name ?? user.email,
      reviewedAt: new Date(),
    },
  })

  // On approval, update WorkerAttendance check-in/check-out
  if (status === '承認') {
    await prisma.workerAttendance.update({
      where: { id: correction.attendanceId },
      data: {
        ...(correction.requestedCheckIn != null
          ? { entryTime: correction.requestedCheckIn }
          : {}),
        ...(correction.requestedCheckOut != null
          ? { exitTime: correction.requestedCheckOut }
          : {}),
      },
    })
  }

  return NextResponse.json(updated)
}
