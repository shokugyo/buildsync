import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const [total, invoiceCount, orderCount] = await Promise.all([
    prisma.documentHash.count({ where: { companyId } }),
    prisma.documentHash.count({ where: { companyId, documentType: 'invoice' } }),
    prisma.documentHash.count({ where: { companyId, documentType: 'order' } }),
  ])

  return NextResponse.json({
    total,
    byType: {
      invoice: invoiceCount,
      order: orderCount,
    },
  })
}
