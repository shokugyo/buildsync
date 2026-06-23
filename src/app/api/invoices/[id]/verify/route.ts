import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeHash } from '@/lib/documentHash'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  // 1. 請求書データをDBから取得
  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, companyId },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })
  if (!invoice) return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })

  // 2. DocumentHash テーブルから保存済みハッシュを取得
  const stored = await prisma.documentHash.findUnique({
    where: { documentType_documentId: { documentType: 'invoice', documentId: params.id } },
  })

  if (!stored) {
    return NextResponse.json({ verified: null, message: '未登録' })
  }

  // 3. 現在のデータのハッシュを計算
  const currentHash = computeHash(invoice as unknown as object)

  // 4 & 5. 一致・不一致の判定
  if (currentHash === stored.hash) {
    return NextResponse.json({ verified: true, hash: stored.hash, createdAt: stored.createdAt })
  } else {
    return NextResponse.json({ verified: false, storedHash: stored.hash, currentHash })
  }
}
