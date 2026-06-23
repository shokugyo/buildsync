import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  await prisma.notification.updateMany({
    where: { userId: (session.user as any).id, isRead: false },
    data: { isRead: true },
  })

  return NextResponse.json({ success: true })
}
