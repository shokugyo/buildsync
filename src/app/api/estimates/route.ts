import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')

  try {
    const estimates = await prisma.estimate.findMany({
      where: {
        companyId: (session.user as any).companyId,
        ...(projectId && { projectId }),
        ...(status && { status }),
      },
      include: {
        project: { select: { name: true, projectNumber: true, customer: { select: { name: true } } } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(estimates)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { projectId, estimateDate, validUntil, notes, status, items = [] } = body

  if (!projectId) return NextResponse.json({ error: '案件は必須です' }, { status: 400 })

  const count = await prisma.estimate.count({ where: { companyId: (session.user as any).companyId } })
  const estimateNumber = `EST-${String(count + 1).padStart(3, '0')}`

  let amount = 0
  if (items.length > 0) {
    amount = items.reduce((s: number, it: any) => s + (parseFloat(it.amount) || 0), 0)
  } else {
    amount = parseFloat(body.amount) || 0
  }
  const taxAmount = Math.round(amount * 0.1)
  const totalAmount = amount + taxAmount

  const estimate = await prisma.estimate.create({
    data: {
      projectId,
      estimateNumber,
      estimateDate: estimateDate ? new Date(estimateDate) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      amount,
      taxAmount,
      totalAmount,
      status: status || '作成中',
      notes: notes || null,
      companyId: (session.user as any).companyId,
      createdBy: (session.user as any).name || (session.user as any).email,
      items: {
        create: items.map((it: any, idx: number) => ({
          name: it.name,
          quantity: parseFloat(it.quantity) || 1,
          unitPrice: parseFloat(it.unitPrice) || 0,
          amount: parseFloat(it.amount) || 0,
          sortOrder: idx,
        })),
      },
    },
    include: {
      project: { select: { name: true, projectNumber: true, customer: { select: { name: true } } } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })

  return NextResponse.json(estimate, { status: 201 })
}
