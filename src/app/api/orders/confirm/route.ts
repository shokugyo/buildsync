import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get('status') || '発注済'

  const orders = await prisma.order.findMany({
    where: {
      companyId,
      status: statusFilter === 'all' ? undefined : statusFilter,
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true, address: true } },
      supplier: { select: { id: true, name: true, contact: true, phone: true, email: true } },
    },
    orderBy: { orderDate: 'desc' },
  })

  return NextResponse.json(orders)
}
