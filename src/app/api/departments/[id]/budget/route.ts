import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)

  const budgets = await prisma.departmentBudget.findMany({
    where: { departmentId: params.id, companyId, year },
    orderBy: [{ category: 'asc' }, { month: 'asc' }],
  })

  return NextResponse.json({ budgets })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const body = await req.json()
  const { year, month, category, budgetAmount, actualAmount } = body

  if (!year || !category || budgetAmount === undefined) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  const dept = await prisma.department.findFirst({ where: { id: params.id, companyId } })
  if (!dept) return NextResponse.json({ error: '部署が見つかりません' }, { status: 404 })

  const budget = await prisma.departmentBudget.create({
    data: {
      departmentId: params.id,
      companyId,
      year: parseInt(year),
      month: month ? parseInt(month) : null,
      category,
      budgetAmount: parseFloat(budgetAmount),
      actualAmount: actualAmount !== undefined ? parseFloat(actualAmount) : 0,
    },
  })

  return NextResponse.json({ budget }, { status: 201 })
}
