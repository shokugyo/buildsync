import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  const [year, mon] = month.split('-').map(Number)
  const start = new Date(year, mon - 1, 1)
  const end = new Date(year, mon, 1)

  const orders = await prisma.order.findMany({
    where: {
      companyId,
      orderDate: { gte: start, lt: end },
    },
    include: {
      supplier: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { orderDate: 'asc' },
  })

  const byDate: Record<string, { orders: typeof orders; totalAmount: number }> = {}
  let monthTotal = 0

  for (const order of orders) {
    if (!order.orderDate) continue
    const dateKey = order.orderDate.toISOString().slice(0, 10)
    if (!byDate[dateKey]) byDate[dateKey] = { orders: [], totalAmount: 0 }
    byDate[dateKey].orders.push(order)
    byDate[dateKey].totalAmount += order.totalAmount
    monthTotal += order.totalAmount
  }

  return NextResponse.json({ byDate, monthTotal })
}
