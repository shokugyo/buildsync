import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasRole, ADMIN_ROLES } from '@/lib/permissions'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  if (!hasRole(session, ADMIN_ROLES)) {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  const body = await req.json()
  const { hourlyRate } = body

  if (hourlyRate === undefined || isNaN(Number(hourlyRate))) {
    return NextResponse.json({ error: 'hourlyRate は必須です' }, { status: 400 })
  }

  try {
    const user = await prisma.user.update({
      where: {
        id: params.id,
        companyId: (session.user as any).companyId,
      },
      data: { hourlyRate: Number(hourlyRate) },
      select: { id: true, name: true, hourlyRate: true },
    })
    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}
