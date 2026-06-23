import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const userId = (session.user as any).id
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const mine = searchParams.get('mine')

  const where: any = { companyId }
  if (status) where.status = status
  if (mine === 'true') where.submittedBy = userId

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      submitter: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(expenses)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const userId = (session.user as any).id
  const body = await req.json()
  const { category, description, amount, expenseDate, projectId, receiptUrl } = body

  if (!category) return NextResponse.json({ error: 'カテゴリは必須です' }, { status: 400 })
  if (!description) return NextResponse.json({ error: '内容は必須です' }, { status: 400 })
  if (!amount) return NextResponse.json({ error: '金額は必須です' }, { status: 400 })
  if (!expenseDate) return NextResponse.json({ error: '日付は必須です' }, { status: 400 })

  const expense = await prisma.expense.create({
    data: {
      category,
      description,
      amount: parseFloat(amount),
      expenseDate: new Date(expenseDate),
      projectId: projectId || null,
      receiptUrl: receiptUrl || null,
      submittedBy: userId,
      companyId,
    },
    include: {
      submitter: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(expense, { status: 201 })
}
