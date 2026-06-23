import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const userId = (session.user as any).id

  await prisma.notification.create({
    data: {
      userId,
      title: 'BuildSync テスト通知',
      content: 'この通知は正常に配信されました',
      type: 'test',
    },
  })

  return NextResponse.json({ success: true, message: 'テスト通知を送信しました' })
}
