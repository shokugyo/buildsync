import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isRestrictedFromCost } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  if (isRestrictedFromCost(session)) {
    return NextResponse.json({ error: '原価情報の閲覧権限がありません' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  // Get last 6 months
  const now = new Date()
  const months: { label: string; year: number; month: number; start: Date; end: Date }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
    months.push({
      label: `${d.getMonth() + 1}月`,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      start,
      end,
    })
  }

  // Fetch orders (actual costs) grouped by month
  const orders = await prisma.order.findMany({
    where: {
      companyId: session.user.companyId,
      ...(projectId && { projectId }),
      createdAt: { gte: months[0].start, lte: months[5].end },
    },
    select: { amount: true, createdAt: true },
  })

  // Fetch budgets for budget amount
  const budgets = await prisma.budget.findMany({
    where: {
      project: { companyId: session.user.companyId },
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { createdAt: true } },
    },
  })

  // Build monthly data
  const trendData = months.map(({ label, start, end }) => {
    // Actual cost: sum orders created in this month
    const actual = orders
      .filter((o) => new Date(o.createdAt) >= start && new Date(o.createdAt) <= end)
      .reduce((s, o) => s + o.amount, 0)

    // Budget: sum budget amounts for projects created in this month
    const budget = budgets
      .filter((b) => {
        const pd = new Date(b.project.createdAt)
        return pd >= start && pd <= end
      })
      .reduce((s, b) => s + b.amount, 0)

    return { label, budget, actual }
  })

  return NextResponse.json(trendData)
}
