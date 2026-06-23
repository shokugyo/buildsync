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

  const count = await prisma.project.count({ where: { companyId } })
  let counter = count

  let imported = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const name = (row['案件名'] || row['name'] || '').trim()
    if (!name) {
      errors.push(`行${i + 1}: 案件名が空です`)
      continue
    }
    try {
      counter++
      const projectNumber = `P-${String(counter).padStart(3, '0')}`
      const contractAmountRaw = row['契約金額'] || row['contractAmount'] || ''
      const estimatedCostRaw = row['予定原価'] || row['estimatedCost'] || ''
      const startDateRaw = row['着工日'] || row['startDate'] || ''
      const endDateRaw = row['完工予定日'] || row['endDate'] || ''

      await prisma.project.create({
        data: {
          projectNumber,
          name,
          status: row['ステータス'] || row['status'] || '引合',
          address: row['住所'] || row['address'] || null,
          workType: row['工事種別'] || row['workType'] || null,
          contractAmount: contractAmountRaw ? parseFloat(contractAmountRaw) : null,
          estimatedCost: estimatedCostRaw ? parseFloat(estimatedCostRaw) : null,
          startDate: startDateRaw ? new Date(startDateRaw) : null,
          endDate: endDateRaw ? new Date(endDateRaw) : null,
          notes: row['備考'] || row['notes'] || null,
          companyId,
        },
      })
      imported++
    } catch {
      errors.push(`行${i + 1}: 登録に失敗しました（${name}）`)
    }
  }

  return NextResponse.json({ imported, errors })
}
