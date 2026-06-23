import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { ids, action } = body as { ids: string[]; action: 'read' | 'delete' }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'IDが必要です' }, { status: 400 })
  }

  const userId = (session.user as any).id as string

  if (action === 'read') {
    await prisma.notification.updateMany({
      where: { id: { in: ids }, userId },
      data: { isRead: true },
    })
    return NextResponse.json({ success: true, count: ids.length })
  }

  if (action === 'delete') {
    await prisma.notification.deleteMany({
      where: { id: { in: ids }, userId },
    })
    return NextResponse.json({ success: true, count: ids.length })
  }

  return NextResponse.json({ error: '無効なアクションです' }, { status: 400 })
}
