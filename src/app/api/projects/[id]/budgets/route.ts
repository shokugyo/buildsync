import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const budgets = await prisma.budget.findMany({
    where: {
      projectId: params.id,
      companyId: (session.user as any).companyId,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(budgets)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { category, description, amount } = body

  if (!category || amount === undefined) {
    return NextResponse.json({ error: 'カテゴリと予算額は必須です' }, { status: 400 })
  }

  const budget = await prisma.budget.create({
    data: {
      projectId: params.id,
      category,
      description: description || null,
      amount: parseFloat(amount) || 0,
      companyId: (session.user as any).companyId,
    },
  })

  return NextResponse.json(budget, { status: 201 })
}
