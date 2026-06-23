import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; budgetId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { amount, description } = body

  try {
    const budget = await prisma.budget.update({
      where: {
        id: params.budgetId,
        companyId: (session.user as any).companyId,
      },
      data: {
        ...(amount !== undefined && { amount: parseFloat(amount) || 0 }),
        ...(description !== undefined && { description: description || null }),
      },
    })
    return NextResponse.json(budget)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; budgetId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    await prisma.budget.delete({
      where: {
        id: params.budgetId,
        companyId: (session.user as any).companyId,
      },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
