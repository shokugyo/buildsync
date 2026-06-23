import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string; budgetId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const body = await req.json()
  const { category, budgetAmount, actualAmount, month, year } = body

  const existing = await prisma.departmentBudget.findFirst({
    where: { id: params.budgetId, departmentId: params.id, companyId },
  })
  if (!existing) return NextResponse.json({ error: '予算が見つかりません' }, { status: 404 })

  const updated = await prisma.departmentBudget.update({
    where: { id: params.budgetId },
    data: {
      ...(category !== undefined && { category }),
      ...(budgetAmount !== undefined && { budgetAmount: parseFloat(budgetAmount) }),
      ...(actualAmount !== undefined && { actualAmount: parseFloat(actualAmount) }),
      ...(month !== undefined && { month: month ? parseInt(month) : null }),
      ...(year !== undefined && { year: parseInt(year) }),
    },
  })

  return NextResponse.json({ budget: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; budgetId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const existing = await prisma.departmentBudget.findFirst({
    where: { id: params.budgetId, departmentId: params.id, companyId },
  })
  if (!existing) return NextResponse.json({ error: '予算が見つかりません' }, { status: 404 })

  await prisma.departmentBudget.delete({ where: { id: params.budgetId } })

  return NextResponse.json({ success: true })
}
