import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if ((session.user as any).role !== '管理者') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || undefined
  const action = searchParams.get('action') || undefined
  const dateFrom = searchParams.get('dateFrom') || undefined
  const dateTo = searchParams.get('dateTo') || undefined
  const keyword = searchParams.get('keyword') || undefined

  const logs = await prisma.auditLog.findMany({
    where: {
      companyId,
      ...(userId && { userId }),
      ...(action && { action }),
      ...(dateFrom || dateTo ? {
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo + 'T23:59:59') }),
        }
      } : {}),
      ...(keyword && {
        OR: [
          { action: { contains: keyword } },
          { target: { contains: keyword } },
          { detail: { contains: keyword } },
          { userName: { contains: keyword } },
        ]
      }),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json(logs)
}
