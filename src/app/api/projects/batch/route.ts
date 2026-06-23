import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { ids, action } = body as { ids: string[]; action: 'archive' | 'delete' }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'IDが必要です' }, { status: 400 })
  }

  const companyId = session.user.companyId

  if (action === 'archive') {
    await prisma.project.updateMany({
      where: { id: { in: ids }, companyId },
      data: { status: 'アーカイブ' },
    })
    return NextResponse.json({ success: true, count: ids.length })
  }

  if (action === 'delete') {
    await prisma.project.updateMany({
      where: { id: { in: ids }, companyId },
      data: { deletedAt: new Date() },
    })
    return NextResponse.json({ success: true, count: ids.length })
  }

  return NextResponse.json({ error: '無効なアクションです' }, { status: 400 })
}
