import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasRole, APPROVER_ROLES } from '@/lib/permissions'

const SUPPLIER_ROLES = ['協力会社管理者', '協力会社作業者'] as const

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const isSupplierRole = hasRole(session, SUPPLIER_ROLES)
  if (!hasRole(session, APPROVER_ROLES) && !isSupplierRole) {
    return NextResponse.json({ error: '受注確認権限がありません' }, { status: 403 })
  }

  const companyId = (session.user as any).companyId
  const userId = (session.user as any).id
  const body = await req.json()
  const { confirmationNote } = body

  const existing = await prisma.order.findFirst({
    where: { id: params.id, companyId },
  })
  if (!existing) return NextResponse.json({ error: '発注が見つかりません' }, { status: 404 })

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: {
      confirmedAt: new Date(),
      confirmedBy: userId,
      confirmationNote: confirmationNote || null,
      status: '受領確認済',
    },
    include: {
      project: { select: { id: true, name: true, projectNumber: true, address: true } },
      supplier: { select: { id: true, name: true, contact: true, phone: true, email: true } },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  if (!hasRole(session, APPROVER_ROLES)) {
    return NextResponse.json({ error: '発注承認権限がありません' }, { status: 403 })
  }

  const companyId = (session.user as any).companyId

  const existing = await prisma.order.findFirst({ where: { id: params.id, companyId } })
  if (!existing) return NextResponse.json({ error: '発注が見つかりません' }, { status: 404 })

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: { confirmedAt: null, confirmedBy: null, confirmationNote: null, status: '発注済' },
    include: {
      project: { select: { id: true, name: true, projectNumber: true, address: true } },
      supplier: { select: { id: true, name: true, contact: true, phone: true, email: true } },
    },
  })

  return NextResponse.json(updated)
}
