import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const suppliers = await prisma.supplier.findMany({
    where: { companyId: (session.user as any).companyId, deletedAt: null },
    include: { _count: { select: { orders: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(suppliers)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const {
    name, type, address, phone, email, contact, notes,
    licenseNumber, licenseType, licenseExpiry, insuranceExpiry,
    bankName, bankBranch, bankAccountNumber, bankAccountName,
  } = body

  if (!name) return NextResponse.json({ error: '業者名は必須です' }, { status: 400 })

  const supplier = await prisma.supplier.create({
    data: {
      name,
      type: type || '協力会社',
      address: address || null,
      phone: phone || null,
      email: email || null,
      contact: contact || null,
      notes: notes || null,
      licenseNumber: licenseNumber || null,
      licenseType: licenseType || null,
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
      bankName: bankName || null,
      bankBranch: bankBranch || null,
      bankAccountNumber: bankAccountNumber || null,
      bankAccountName: bankAccountName || null,
      companyId: (session.user as any).companyId,
    },
    include: { _count: { select: { orders: true } } },
  })

  return NextResponse.json(supplier, { status: 201 })
}
