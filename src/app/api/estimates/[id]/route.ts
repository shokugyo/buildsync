import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasRole, APPROVER_ROLES } from '@/lib/permissions'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const estimate = await prisma.estimate.findFirst({
    where: { id: params.id, companyId: (session.user as any).companyId },
    include: {
      project: {
        select: {
          id: true, name: true, projectNumber: true, address: true,
          customer: { select: { name: true } },
        },
      },
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (!estimate) return NextResponse.json({ error: '見積が見つかりません' }, { status: 404 })
  return NextResponse.json(estimate)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { estimateDate, validUntil, status, notes, items } = body

  if (status === '承認済' && !hasRole(session, APPROVER_ROLES)) {
    return NextResponse.json({ error: '承認権限が必要です' }, { status: 403 })
  }

  try {
    let finalAmount: number | undefined
    if (items !== undefined && items.length > 0) {
      finalAmount = items.reduce((s: number, it: any) => s + (parseFloat(it.amount) || 0), 0)
    } else if (body.amount !== undefined) {
      finalAmount = Number(body.amount)
    }

    const estimate = await prisma.estimate.update({
      where: { id: params.id },
      data: {
        ...(estimateDate !== undefined && { estimateDate: estimateDate ? new Date(estimateDate) : null }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        ...(finalAmount !== undefined && {
          amount: finalAmount,
          taxAmount: Math.round(finalAmount * 0.1),
          totalAmount: finalAmount + Math.round(finalAmount * 0.1),
        }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(items !== undefined && {
          items: {
            deleteMany: {},
            create: items.map((it: any, idx: number) => ({
              name: it.name,
              quantity: parseFloat(it.quantity) || 1,
              unitPrice: parseFloat(it.unitPrice) || 0,
              amount: parseFloat(it.amount) || 0,
              sortOrder: idx,
            })),
          },
        }),
      },
      include: {
        project: { select: { name: true, projectNumber: true, customer: { select: { name: true } } } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    })
    return NextResponse.json(estimate)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  await prisma.estimate.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
