import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const useConfig = searchParams.get('config') === 'true'

  if (useConfig) {
    const configs = await prisma.webhookConfig.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        logs: {
          orderBy: { sentAt: 'desc' },
          take: 5,
        },
      },
    })
    return NextResponse.json(configs)
  }

  // Legacy: list old Webhook model records
  const webhooks = await prisma.webhook.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(webhooks)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if ((session.user as any).role !== '管理者') return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

  const companyId = (session.user as any).companyId
  const body = await req.json()
  const { url, events, secret, config: isConfig, name } = body

  if (isConfig) {
    if (!url) return NextResponse.json({ error: 'URLは必須です' }, { status: 400 })
    const created = await prisma.webhookConfig.create({
      data: {
        url,
        events: JSON.stringify(Array.isArray(events) ? events : []),
        secret: secret || null,
        companyId,
      },
      include: { logs: true },
    })
    return NextResponse.json(created, { status: 201 })
  }

  // Legacy: create old Webhook model record
  if (!name || !url) return NextResponse.json({ error: '名前とURLは必須です' }, { status: 400 })
  const webhook = await prisma.webhook.create({
    data: {
      name,
      url,
      events: Array.isArray(events) ? events.join(',') : (events || ''),
      secret: secret || null,
      companyId,
    },
  })
  return NextResponse.json(webhook, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if ((session.user as any).role !== '管理者') return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

  const body = await req.json()
  const { id, name, url, events, secret, isActive } = body
  if (!id) return NextResponse.json({ error: 'IDが必要です' }, { status: 400 })

  const webhook = await prisma.webhook.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(url !== undefined && { url }),
      ...(events !== undefined && { events: Array.isArray(events) ? events.join(',') : events }),
      ...(secret !== undefined && { secret }),
      ...(isActive !== undefined && { isActive }),
    },
  })
  return NextResponse.json(webhook)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if ((session.user as any).role !== '管理者') return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'IDが必要です' }, { status: 400 })

  await prisma.webhook.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
