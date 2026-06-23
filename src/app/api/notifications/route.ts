import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const unread = searchParams.get('unread') === 'true'

  if (unread) {
    const count = await prisma.notification.count({
      where: { userId: (session.user as any).id, isRead: false },
    })
    return NextResponse.json({ count })
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(notifications)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (id) {
    await prisma.notification.deleteMany({
      where: { id, userId: (session.user as any).id },
    })
    return NextResponse.json({ success: true })
  }

  // Delete all notifications for user
  await prisma.notification.deleteMany({
    where: { userId: (session.user as any).id },
  })

  return NextResponse.json({ success: true })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { id, markAll } = body

  if (id) {
    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })
    return NextResponse.json({ success: true })
  }

  // Mark all as read
  await prisma.notification.updateMany({
    where: { userId: (session.user as any).id },
    data: { isRead: true },
  })

  return NextResponse.json({ success: true })
}
