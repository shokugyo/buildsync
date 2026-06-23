import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const customer = await prisma.customer.findFirst({
    where: { id: params.id, companyId: (session.user as any).companyId },
    include: {
      projects: {
        select: { id: true, projectNumber: true, name: true, status: true, startDate: true, deliveryDate: true },
        orderBy: { createdAt: 'desc' },
      },
      leads: {
        select: { id: true, title: true, status: true, estimatedAmount: true, contactDate: true, source: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!customer) return NextResponse.json({ error: '顧客が見つかりません' }, { status: 404 })
  return NextResponse.json(customer)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { name, type, address, phone, email } = body

  try {
    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
      },
    })
    return NextResponse.json(customer)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    await prisma.customer.update({ where: { id: params.id }, data: { deletedAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
