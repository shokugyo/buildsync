import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasRole, ADMIN_ROLES } from '@/lib/permissions'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  if (!hasRole(session, ADMIN_ROLES)) {
    return NextResponse.json({ error: 'ユーザー管理権限がありません' }, { status: 403 })
  }

  const { id } = params

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, companyId: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
  }

  // Ensure admin can only unlock users in the same company
  if (user.companyId !== (session.user as any).companyId) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
  }

  await prisma.user.update({
    where: { id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  })

  return NextResponse.json({ success: true })
}
