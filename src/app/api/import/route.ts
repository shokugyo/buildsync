import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current.trim())
  return result
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const companyId = (session.user as any).companyId

  const text = await req.text()
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)

  // ヘッダー行をスキップ
  const dataLines = lines.slice(1)

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  if (type === 'customers') {
    // 顧客名（必須）, 顧客種別, 郵便番号, 住所, 電話番号, メールアドレス, 担当者
    const existingNames = new Set(
      (await prisma.customer.findMany({ where: { companyId }, select: { name: true } })).map((c) => c.name)
    )

    for (let i = 0; i < dataLines.length; i++) {
      const cols = parseCsvLine(dataLines[i])
      const name = cols[0] ?? ''
      if (!name) {
        errors.push(`行${i + 2}: 顧客名が空です`)
        continue
      }
      if (existingNames.has(name)) {
        skipped++
        continue
      }
      try {
        await prisma.customer.create({
          data: {
            name,
            type: cols[1] || '法人',
            address: cols[3] || null,
            phone: cols[4] || null,
            email: cols[5] || null,
            companyId,
          },
        })
        existingNames.add(name)
        imported++
      } catch (e) {
        errors.push(`行${i + 2}: 登録に失敗しました（${name}）`)
      }
    }
  } else if (type === 'suppliers') {
    // 会社名（必須）, 住所, 電話番号, メールアドレス, 適格請求書発行事業者番号, 担当者名
    const existingNames = new Set(
      (await prisma.supplier.findMany({ where: { companyId }, select: { name: true } })).map((s) => s.name)
    )

    for (let i = 0; i < dataLines.length; i++) {
      const cols = parseCsvLine(dataLines[i])
      const name = cols[0] ?? ''
      if (!name) {
        errors.push(`行${i + 2}: 会社名が空です`)
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
            address: cols[1] || null,
            phone: cols[2] || null,
            email: cols[3] || null,
            contact: cols[5] || null,
            companyId,
          },
        })
        existingNames.add(name)
        imported++
      } catch (e) {
        errors.push(`行${i + 2}: 登録に失敗しました（${name}）`)
      }
    }
  } else if (type === 'projects') {
    // 案件名（必須）, ステータス, 住所, 工事種別, 契約金額, 予定原価, 着工日, 完工予定日, 備考
    const count = await prisma.project.count({ where: { companyId } })
    let counter = count

    for (let i = 0; i < dataLines.length; i++) {
      const cols = parseCsvLine(dataLines[i])
      const name = cols[0] ?? ''
      if (!name) {
        errors.push(`行${i + 2}: 案件名が空です`)
        continue
      }
      try {
        counter++
        const projectNumber = `PRJ-${String(counter).padStart(3, '0')}`
        await prisma.project.create({
          data: {
            projectNumber,
            name,
            status: cols[1] || '引合',
            address: cols[2] || null,
            workType: cols[3] || null,
            contractAmount: cols[4] ? parseFloat(cols[4]) : null,
            estimatedCost: cols[5] ? parseFloat(cols[5]) : null,
            startDate: cols[6] ? new Date(cols[6]) : null,
            endDate: cols[7] ? new Date(cols[7]) : null,
            notes: cols[8] || null,
            companyId,
          },
        })
        imported++
      } catch (e) {
        errors.push(`行${i + 2}: 登録に失敗しました（${name}）`)
      }
    }
  } else {
    return NextResponse.json({ error: '不正なtypeです' }, { status: 400 })
  }

  return NextResponse.json({ imported, skipped, errors })
}
