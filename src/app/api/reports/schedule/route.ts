import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const schedules = await prisma.reportSchedule.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(schedules)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const body = await req.json()
  const { name, reportType, frequency, dayOfWeek, dayOfMonth, recipients } = body

  if (!name || !reportType || !frequency || !recipients) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  const schedule = await prisma.reportSchedule.create({
    data: {
      companyId,
      name,
      reportType,
      frequency,
      dayOfWeek: dayOfWeek ?? null,
      dayOfMonth: dayOfMonth ?? null,
      recipients: JSON.stringify(
        typeof recipients === 'string'
          ? recipients.split(',').map((e: string) => e.trim()).filter(Boolean)
          : recipients
      ),
      enabled: true,
    },
  })

  return NextResponse.json(schedule, { status: 201 })
}
