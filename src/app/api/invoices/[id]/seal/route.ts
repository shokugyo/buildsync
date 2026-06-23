import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeHash } from '@/lib/documentHash'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId
  const userId = (session.user as any).id

  // 1. 請求書データを取得
  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, companyId },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })
  if (!invoice) return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })

  // 2. ハッシュを計算して DocumentHash に保存（upsert）
  const hash = computeHash(invoice as unknown as object)

  const docHash = await prisma.documentHash.upsert({
    where: { documentType_documentId: { documentType: 'invoice', documentId: params.id } },
    create: {
      documentType: 'invoice',
      documentId: params.id,
      hash,
      algorithm: 'SHA-256',
      createdBy: userId,
      companyId,
    },
    update: {
      hash,
      createdBy: userId,
      createdAt: new Date(),
    },
  })

  // 3. { hash, createdAt } を返す
  return NextResponse.json({ hash: docHash.hash, createdAt: docHash.createdAt })
}
