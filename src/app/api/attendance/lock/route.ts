import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasRole } from '@/lib/permissions'

const MANAGER_ROLES = ['管理者', '会社管理者', '現場監督'] as const

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const user = session.user as any
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month is required' }, { status: 400 })

  const lock = await prisma.monthlyAttendanceLock.findUnique({
    where: { month_companyId: { month, companyId: user.companyId } },
  })

  return NextResponse.json({ locked: !!lock, lock })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!hasRole(session, MANAGER_ROLES)) {
    return NextResponse.json({ error: '締め処理権限が必要です' }, { status: 403 })
  }

  const user = session.user as any
  const body = await req.json()
  const { month } = body
  if (!month) return NextResponse.json({ error: 'month is required' }, { status: 400 })

  const lock = await prisma.monthlyAttendanceLock.upsert({
    where: { month_companyId: { month, companyId: user.companyId } },
    create: { month, lockedBy: user.id, companyId: user.companyId },
    update: { lockedBy: user.id, lockedAt: new Date() },
  })

  await prisma.workerAttendance.updateMany({
    where: {
      companyId: user.companyId,
      workDate: {
        gte: new Date(`${month}-01`),
        lt: new Date(
          month.endsWith('-12')
            ? `${parseInt(month.slice(0, 4)) + 1}-01-01`
            : `${month.slice(0, 4)}-${String(parseInt(month.slice(5)) + 1).padStart(2, '0')}-01`
        ),
      },
    },
    data: { isLocked: true },
  })

  return NextResponse.json({ success: true, lock })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!hasRole(session, MANAGER_ROLES)) {
    return NextResponse.json({ error: '権限が必要です' }, { status: 403 })
  }

  const user = session.user as any
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month is required' }, { status: 400 })

  await prisma.monthlyAttendanceLock.deleteMany({
    where: { month, companyId: user.companyId },
  })

  await prisma.workerAttendance.updateMany({
    where: {
      companyId: user.companyId,
      workDate: {
        gte: new Date(`${month}-01`),
        lt: new Date(
          month.endsWith('-12')
            ? `${parseInt(month.slice(0, 4)) + 1}-01-01`
            : `${month.slice(0, 4)}-${String(parseInt(month.slice(5)) + 1).padStart(2, '0')}-01`
        ),
      },
    },
    data: { isLocked: false },
  })

  return NextResponse.json({ success: true })
}
