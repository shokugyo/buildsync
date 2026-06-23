import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if ((session.user as any).role !== '管理者') return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

  const companyId = (session.user as any).companyId
  const { id } = params
  const body = await req.json()
  const { url, events, secret, enabled } = body

  const existing = await prisma.webhookConfig.findFirst({ where: { id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const updated = await prisma.webhookConfig.update({
    where: { id },
    data: {
      ...(url !== undefined && { url }),
      ...(events !== undefined && { events: JSON.stringify(Array.isArray(events) ? events : []) }),
      ...(secret !== undefined && { secret: secret || null }),
      ...(enabled !== undefined && { enabled }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if ((session.user as any).role !== '管理者') return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

  const companyId = (session.user as any).companyId
  const { id } = params

  const existing = await prisma.webhookConfig.findFirst({ where: { id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  await prisma.webhookConfig.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
