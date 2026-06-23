import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const userId = (session.user as any).id
  const body = await req.json()

  const existing = await prisma.expense.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const { status, category, description, amount, expenseDate, projectId, receiptUrl } = body

  const data: any = {}
  if (status !== undefined) {
    data.status = status
    if (status === '承認済' || status === '却下') {
      data.approvedBy = userId
      data.approvedAt = new Date()
    }
  }
  if (category !== undefined) data.category = category
  if (description !== undefined) data.description = description
  if (amount !== undefined) data.amount = parseFloat(amount)
  if (expenseDate !== undefined) data.expenseDate = new Date(expenseDate)
  if (projectId !== undefined) data.projectId = projectId || null
  if (receiptUrl !== undefined) data.receiptUrl = receiptUrl || null

  const expense = await prisma.expense.update({
    where: { id: params.id },
    data,
    include: {
      submitter: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(expense)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const existing = await prisma.expense.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  await prisma.expense.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
