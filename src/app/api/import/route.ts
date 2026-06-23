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

  let created = 0
  let updated = 0
  let skipped = 0
  const errors: Array<{ row: number; message: string }> = []

  if (type === 'customers') {
    // 顧客名（必須）, 顧客種別, 郵便番号, 住所, 電話番号, メールアドレス, 担当者
    const existingNames = new Set(
      (await prisma.customer.findMany({ where: { companyId }, select: { name: true } })).map((c) => c.name)
    )

    for (let i = 0; i < dataLines.length; i++) {
      const cols = parseCsvLine(dataLines[i])
      const name = cols[0] ?? ''
      if (!name) {
        errors.push({ row: i + 2, message: '顧客名が空です' })
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
        created++
      } catch (e) {
        errors.push({ row: i + 2, message: `登録に失敗しました（${name}）` })
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
        errors.push({ row: i + 2, message: '会社名が空です' })
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
        created++
      } catch (e) {
        errors.push({ row: i + 2, message: `登録に失敗しました（${name}）` })
      }
    }
  } else if (type === 'projects') {
    // CSV列（0-based index）:
    // 0: 案件番号（必須）, 1: 案件名（必須）, 2: ステータス, 3: 顧客名（Customer lookup）,
    // 4: 現場住所, 5: 工事種別, 6: 担当者メール（User lookup）,
    // 7: 着工予定日（YYYY-MM-DD）, 8: 完工予定日, 9: 引渡予定日,
    // 10: 契約金額, 11: 実行予算, 12: 備考

    // 既存案件番号を取得（upsert用）
    const existingProjects = await prisma.project.findMany({
      where: { companyId },
      select: { id: true, projectNumber: true },
    })
    const existingMap = new Map(existingProjects.map(p => [p.projectNumber, p.id]))

    // 顧客名 → customerId キャッシュ
    const customerCache: Record<string, string | null> = {}
    // 担当者メール → managerId キャッシュ
    const managerCache: Record<string, string | null> = {}

    const parseDate = (val: string): Date | null => {
      if (!val) return null
      const d = new Date(val)
      if (isNaN(d.getTime())) return null
      return d
    }

    for (let i = 0; i < dataLines.length; i++) {
      const cols = parseCsvLine(dataLines[i])
      const projectNumber = cols[0]?.trim() ?? ''
      const name = cols[1]?.trim() ?? ''

      if (!projectNumber) {
        errors.push({ row: i + 2, message: '案件番号が空です' })
        continue
      }
      if (!name) {
        errors.push({ row: i + 2, message: '案件名が空です' })
        continue
      }

      // 日付パース（エラーは行スキップ）
      const startDateStr = cols[7]?.trim() ?? ''
      const endDateStr = cols[8]?.trim() ?? ''
      const deliveryDateStr = cols[9]?.trim() ?? ''

      const startDate = startDateStr ? parseDate(startDateStr) : null
      const endDate = endDateStr ? parseDate(endDateStr) : null
      const deliveryDate = deliveryDateStr ? parseDate(deliveryDateStr) : null

      if (startDateStr && startDate === null) {
        errors.push({ row: i + 2, message: `着工予定日の形式が不正です（${startDateStr}）` })
        skipped++
        continue
      }
      if (endDateStr && endDate === null) {
        errors.push({ row: i + 2, message: `完工予定日の形式が不正です（${endDateStr}）` })
        skipped++
        continue
      }
      if (deliveryDateStr && deliveryDate === null) {
        errors.push({ row: i + 2, message: `引渡予定日の形式が不正です（${deliveryDateStr}）` })
        skipped++
        continue
      }

      // 顧客名 → customerId
      const customerName = cols[3]?.trim() ?? ''
      let customerId: string | null = null
      if (customerName) {
        if (customerName in customerCache) {
          customerId = customerCache[customerName]
        } else {
          const found = await prisma.customer.findFirst({
            where: { name: customerName, companyId },
            select: { id: true },
          })
          customerId = found?.id ?? null
          customerCache[customerName] = customerId
        }
      }

      // 担当者メール → managerId
      const managerEmail = cols[6]?.trim() ?? ''
      let managerId: string | null = null
      if (managerEmail) {
        if (managerEmail in managerCache) {
          managerId = managerCache[managerEmail]
        } else {
          const found = await prisma.user.findFirst({
            where: { email: managerEmail, companyId },
            select: { id: true },
          })
          managerId = found?.id ?? null
          managerCache[managerEmail] = managerId
        }
      }

      const parseAmount = (val: string | undefined): number | null => {
        if (!val || !val.trim()) return null
        const n = parseFloat(val.replace(/,/g, ''))
        return isNaN(n) ? null : n
      }

      const data = {
        name,
        status: cols[2]?.trim() || '引合',
        customerId,
        address: cols[4]?.trim() || null,
        workType: cols[5]?.trim() || null,
        managerId,
        startDate,
        endDate,
        deliveryDate,
        contractAmount: parseAmount(cols[10]),
        estimatedCost: parseAmount(cols[11]),
        notes: cols[12]?.trim() || null,
        companyId,
      }

      try {
        const existingId = existingMap.get(projectNumber)
        if (existingId) {
          await prisma.project.update({
            where: { id: existingId },
            data,
          })
          updated++
        } else {
          await prisma.project.create({
            data: { projectNumber, ...data },
          })
          existingMap.set(projectNumber, projectNumber)
          created++
        }
      } catch (e) {
        errors.push({ row: i + 2, message: `登録に失敗しました（${name}）` })
      }
    }
  } else {
    return NextResponse.json({ error: '不正なtypeです' }, { status: 400 })
  }

  return NextResponse.json({ success: true, created, updated, skipped, errors })
}
