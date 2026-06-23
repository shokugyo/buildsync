import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasRole, ADMIN_ROLES } from '@/lib/permissions'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!hasRole(session, ADMIN_ROLES)) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const companyId = (session.user as any).companyId
  const invitation = await prisma.invitation.findFirst({ where: { id: params.id, companyId } })
  if (!invitation) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const updated = await prisma.invitation.update({
    where: { id: params.id },
    data: { status: 'キャンセル' },
  })
  return NextResponse.json(updated)
}
