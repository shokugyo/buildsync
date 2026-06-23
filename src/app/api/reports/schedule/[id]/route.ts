import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const existing = await prisma.reportSchedule.findFirst({
    where: { id: params.id, companyId },
  })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const body = await req.json()
  const { name, reportType, frequency, dayOfWeek, dayOfMonth, recipients, enabled } = body

  const updated = await prisma.reportSchedule.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(reportType !== undefined && { reportType }),
      ...(frequency !== undefined && { frequency }),
      ...(dayOfWeek !== undefined && { dayOfWeek }),
      ...(dayOfMonth !== undefined && { dayOfMonth }),
      ...(recipients !== undefined && {
        recipients: JSON.stringify(
          typeof recipients === 'string'
            ? recipients.split(',').map((e: string) => e.trim()).filter(Boolean)
            : recipients
        ),
      }),
      ...(enabled !== undefined && { enabled }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const existing = await prisma.reportSchedule.findFirst({
    where: { id: params.id, companyId },
  })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  await prisma.reportSchedule.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
