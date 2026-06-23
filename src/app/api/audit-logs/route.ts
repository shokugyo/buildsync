import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== '管理者' && role !== '会社管理者') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)

  const action = searchParams.get('action') || undefined
  const target = searchParams.get('target') || undefined
  const userId = searchParams.get('userId') || undefined
  const dateFrom = searchParams.get('dateFrom') || undefined
  const dateTo = searchParams.get('dateTo') || undefined
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  const where = {
    companyId,
    ...(action && { action }),
    ...(target && { target: { contains: target } }),
    ...(userId && { userId }),
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo + 'T23:59:59') }),
      },
    }),
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}
