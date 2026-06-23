import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const body = await req.json()
  const rows: Record<string, string>[] = body.rows || []

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'rowsが空です' }, { status: 400 })
  }

  const existingNames = new Set(
    (await prisma.supplier.findMany({ where: { companyId }, select: { name: true } })).map((s) => s.name)
  )

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const name = (row['業者名'] || row['会社名'] || row['name'] || '').trim()
    if (!name) {
      errors.push(`行${i + 1}: 業者名が空です`)
      continue
    }
    if (existingNames.has(name)) {
      skipped++
      continue
    }
    try {
      await prisma.supplier.create({
        data: {
          name,
          type: row['種別'] || row['type'] || '協力会社',
          address: row['住所'] || row['address'] || null,
          phone: row['電話番号'] || row['phone'] || null,
          email: row['メールアドレス'] || row['email'] || null,
          contact: row['担当者名'] || row['contact'] || null,
          notes: row['備考'] || row['notes'] || null,
          companyId,
        },
      })
      existingNames.add(name)
      imported++
    } catch {
      errors.push(`行${i + 1}: 登録に失敗しました（${name}）`)
    }
  }

  return NextResponse.json({ imported, skipped, errors })
}
