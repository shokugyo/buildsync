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

  const budgets = await prisma.budget.findMany({
    where: {
      project: { companyId: session.user.companyId },
      ...(projectId && { projectId }),
    },
    include: { project: { select: { id: true, name: true, projectNumber: true, contractAmount: true } } },
    orderBy: { project: { projectNumber: 'asc' } },
  })

  return NextResponse.json(budgets.map(b => ({
    ...b,
    budgetAmount: b.amount,
  })))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  if (isRestrictedFromCost(session)) {
    return NextResponse.json({ error: '原価情報の閲覧権限がありません' }, { status: 403 })
  }

  const body = await req.json()

  const budgetAmount = parseFloat(body.budgetAmount || body.amount) || 0
  const orderedAmount = parseFloat(body.orderedAmount) || 0
  const invoicedAmount = parseFloat(body.invoicedAmount) || 0
  const paidAmount = parseFloat(body.paidAmount) || 0

  const budget = await prisma.budget.create({
    data: {
      projectId: body.projectId,
      category: body.category,
      description: body.description || null,
      amount: budgetAmount,
      orderedAmount,
      invoicedAmount,
      paidAmount,
      companyId: (session.user as any).companyId,
    },
    include: { project: { select: { id: true, name: true, projectNumber: true, contractAmount: true } } },
  })

  return NextResponse.json({ ...budget, budgetAmount: budget.amount }, { status: 201 })
}
