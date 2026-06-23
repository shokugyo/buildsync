import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: { suppliers: [{name, kana, phone, email, contactName, address, type, notes}][] }
//   or: { rows: Record<string, string>[] }  (CSV row-object format from CsvImportModal)
// 一括 createMany — 重複（同名）はスキップ
// Returns: { success: true, created: number, skipped: number, imported: number, errors: string[] }

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const body = await req.json()

  // Support both { suppliers: [...] } and { rows: [...] } formats
  const rawRows: Array<Record<string, string>> = body.rows || []
  const rawSuppliers: Array<{
    name?: string; kana?: string; phone?: string; email?: string;
    contactName?: string; contact?: string; address?: string; type?: string; notes?: string;
  }> = body.suppliers || []

  if (rawRows.length === 0 && rawSuppliers.length === 0) {
    return NextResponse.json({ error: 'データが空です' }, { status: 400 })
  }

  // Normalize to a common shape
  type SupplierInput = {
    name: string; phone: string | null; email: string | null;
    contact: string | null; address: string | null; type: string; notes: string | null;
  }

  const normalized: SupplierInput[] = []

  for (const row of rawRows) {
    const name = (row['会社名'] || row['業者名'] || row['name'] || '').trim()
    if (!name) continue
    normalized.push({
      name,
      phone: row['電話番号'] || row['phone'] || null,
      email: row['メールアドレス'] || row['email'] || null,
      contact: row['担当者名'] || row['contact'] || null,
      address: row['住所'] || row['address'] || null,
      type: row['業種区分'] || row['種別'] || row['type'] || '協力会社',
      notes: row['備考'] || row['notes'] || null,
    })
  }

  for (const s of rawSuppliers) {
    const name = (s.name || '').trim()
    if (!name) continue
    normalized.push({
      name,
      phone: s.phone || null,
      email: s.email || null,
      contact: s.contactName || s.contact || null,
      address: s.address || null,
      type: s.type || '協力会社',
      notes: s.notes || null,
    })
  }

  if (normalized.length === 0) {
    return NextResponse.json({ error: '有効なデータがありません' }, { status: 400 })
  }

  // Fetch existing names to detect duplicates
  const existingNames = new Set(
    (await prisma.supplier.findMany({
      where: { companyId, deletedAt: null },
      select: { name: true },
    })).map((s) => s.name)
  )

  const toCreate = normalized.filter((s) => !existingNames.has(s.name))
  const skipped = normalized.length - toCreate.length

  let created = 0
  if (toCreate.length > 0) {
    const result = await prisma.supplier.createMany({
      data: toCreate.map((s) => ({
        name: s.name,
        phone: s.phone,
        email: s.email,
        contact: s.contact,
        address: s.address,
        type: s.type,
        notes: s.notes,
        companyId,
      })),
    })
    created = result.count
  }

  return NextResponse.json({
    success: true,
    created,
    skipped,
    // Also expose as `imported` for CsvImportModal compatibility
    imported: created,
    errors: [],
  })
}
