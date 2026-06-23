import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasRole, ADMIN_ROLES } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const company = await prisma.company.findUnique({
    where: { id: (session.user as any).companyId },
  })

  return NextResponse.json(company)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  if (!hasRole(session, ADMIN_ROLES)) {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  const body = await req.json()
  const {
    name, kanaName, type, url, postalCode, prefecture,
    address, address1, address2, representativeName, phone, email, registrationNumber,
    logoUrl, sealUrl,
    bankName, bankBranch, bankAccountType, bankAccountNumber, bankAccountName,
    defaultPaymentTerms,
  } = body

  if (!name) return NextResponse.json({ error: '会社名は必須です' }, { status: 400 })

  const company = await prisma.company.update({
    where: { id: (session.user as any).companyId },
    data: {
      name,
      kanaName: kanaName || null,
      type: type || '元請',
      url: url || null,
      postalCode: postalCode || null,
      prefecture: prefecture || null,
      address: address || null,
      address1: address1 || null,
      address2: address2 || null,
      representativeName: representativeName || null,
      phone: phone || null,
      email: email || null,
      registrationNumber: registrationNumber || null,
      logoUrl: logoUrl || null,
      sealUrl: sealUrl || null,
      bankName: bankName || null,
      bankBranch: bankBranch || null,
      bankAccountType: bankAccountType || null,
      bankAccountNumber: bankAccountNumber || null,
      bankAccountName: bankAccountName || null,
      defaultPaymentTerms: defaultPaymentTerms != null ? Number(defaultPaymentTerms) : 30,
    },
  })

  return NextResponse.json(company)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  if (!hasRole(session, ADMIN_ROLES)) {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  const body = await req.json()
  const {
    name, kanaName, type, url, postalCode, prefecture,
    address, address1, address2, representativeName, phone, email, registrationNumber,
    logoUrl, sealUrl,
    bankName, bankBranch, bankAccountType, bankAccountNumber, bankAccountName,
    defaultPaymentTerms,
  } = body

  const data: Record<string, any> = {}
  if (name !== undefined) {
    if (!name) return NextResponse.json({ error: '会社名は必須です' }, { status: 400 })
    data.name = name
  }
  if (kanaName !== undefined) data.kanaName = kanaName || null
  if (type !== undefined) data.type = type || '元請'
  if (url !== undefined) data.url = url || null
  if (postalCode !== undefined) data.postalCode = postalCode || null
  if (prefecture !== undefined) data.prefecture = prefecture || null
  if (address !== undefined) data.address = address || null
  if (address1 !== undefined) data.address1 = address1 || null
  if (address2 !== undefined) data.address2 = address2 || null
  if (representativeName !== undefined) data.representativeName = representativeName || null
  if (phone !== undefined) data.phone = phone || null
  if (email !== undefined) data.email = email || null
  if (registrationNumber !== undefined) data.registrationNumber = registrationNumber || null
  if (logoUrl !== undefined) data.logoUrl = logoUrl || null
  if (sealUrl !== undefined) data.sealUrl = sealUrl || null
  if (bankName !== undefined) data.bankName = bankName || null
  if (bankBranch !== undefined) data.bankBranch = bankBranch || null
  if (bankAccountType !== undefined) data.bankAccountType = bankAccountType || null
  if (bankAccountNumber !== undefined) data.bankAccountNumber = bankAccountNumber || null
  if (bankAccountName !== undefined) data.bankAccountName = bankAccountName || null
  if (defaultPaymentTerms !== undefined) data.defaultPaymentTerms = Number(defaultPaymentTerms)

  const company = await prisma.company.update({
    where: { id: (session.user as any).companyId },
    data,
  })

  return NextResponse.json(company)
}
