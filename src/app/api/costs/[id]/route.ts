import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyProjectMembers } from '@/lib/notify'
import { isRestrictedFromCost } from '@/lib/permissions'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  if (isRestrictedFromCost(session)) {
    return NextResponse.json({ error: '原価情報の閲覧権限がありません' }, { status: 403 })
  }

  const body = await req.json()
  const { category, amount, budgetAmount, description, orderedAmount, invoicedAmount, paidAmount } = body

  try {
    const resolvedAmount = budgetAmount !== undefined ? Number(budgetAmount) : amount !== undefined ? Number(amount) : undefined

    const budget = await prisma.budget.update({
      where: { id: params.id },
      data: {
        ...(category !== undefined && { category }),
        ...(resolvedAmount !== undefined && { amount: resolvedAmount }),
        ...(description !== undefined && { description: description || null }),
        ...(orderedAmount !== undefined && { orderedAmount: Number(orderedAmount) }),
        ...(invoicedAmount !== undefined && { invoicedAmount: Number(invoicedAmount) }),
        ...(paidAmount !== undefined && { paidAmount: Number(paidAmount) }),
      },
      include: { project: { select: { id: true, name: true, projectNumber: true, contractAmount: true } } },
    })

    return NextResponse.json({ ...budget, budgetAmount: budget.amount })
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  if (isRestrictedFromCost(session)) {
    return NextResponse.json({ error: '原価情報の閲覧権限がありません' }, { status: 403 })
  }

  try {
    await prisma.budget.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
