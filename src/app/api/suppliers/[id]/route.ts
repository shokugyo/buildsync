import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const supplier = await prisma.supplier.findFirst({
    where: { id: params.id, companyId: (session.user as any).companyId, deletedAt: null },
    include: {
      _count: { select: { orders: true, evaluations: true } },
      evaluations: {
        orderBy: { evaluatedAt: 'desc' },
        include: {
          evaluator: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!supplier) return NextResponse.json({ error: '業者が見つかりません' }, { status: 404 })
  return NextResponse.json(supplier)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const {
    name, type, address, phone, email, contact, notes,
    licenseNumber, licenseType, licenseExpiry, insuranceExpiry,
    bankName, bankBranch, bankAccountNumber, bankAccountName,
  } = body

  try {
    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(address !== undefined && { address: address || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(contact !== undefined && { contact: contact || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(licenseNumber !== undefined && { licenseNumber: licenseNumber || null }),
        ...(licenseType !== undefined && { licenseType: licenseType || null }),
        ...(licenseExpiry !== undefined && { licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null }),
        ...(insuranceExpiry !== undefined && { insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null }),
        ...(bankName !== undefined && { bankName: bankName || null }),
        ...(bankBranch !== undefined && { bankBranch: bankBranch || null }),
        ...(bankAccountNumber !== undefined && { bankAccountNumber: bankAccountNumber || null }),
        ...(bankAccountName !== undefined && { bankAccountName: bankAccountName || null }),
      },
      include: { _count: { select: { orders: true } } },
    })
    return NextResponse.json(supplier)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    await prisma.supplier.update({ where: { id: params.id }, data: { deletedAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
