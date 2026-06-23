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

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    const projectNumber = (row['案件番号'] || '').trim()
    const customerName = (row['請求先'] || '').trim()
    const invoiceDateStr = (row['請求日'] || '').trim()
    const dueDateStr = (row['支払期限'] || '').trim()
    const amountStr = (row['税抜金額'] || '').trim()
    const statusRaw = (row['ステータス'] || '').trim()
    const notes = (row['備考'] || '').trim()

    if (!projectNumber) {
      errors.push(`行${i + 1}: 案件番号が空です`)
      continue
    }

    // Resolve project
    const project = await prisma.project.findFirst({
      where: { companyId, projectNumber },
    })
    if (!project) {
      errors.push(`行${i + 1}: 案件番号「${projectNumber}」が見つかりません`)
      skipped++
      continue
    }

    // Resolve customer (optional)
    let customerId: string | null = null
    if (customerName) {
      const customer = await prisma.customer.findFirst({
        where: { companyId, name: customerName },
      })
      if (customer) customerId = customer.id
    }

    // Parse amount
    const amount = parseFloat(amountStr.replace(/,/g, '')) || 0
    const taxAmount = Math.round(amount * 0.1)
    const totalAmount = amount + taxAmount

    // Parse dates
    const invoiceDate = invoiceDateStr ? new Date(invoiceDateStr) : null
    const dueDate = dueDateStr ? new Date(dueDateStr) : null

    // Status
    const status = statusRaw || '未請求'

    // Auto-generate invoiceNumber
    const count = await prisma.invoice.count({ where: { companyId } })
    const invoiceNumber = `INV-${String(count + 1).padStart(4, '0')}`

    try {
      await prisma.invoice.create({
        data: {
          invoiceNumber,
          invoiceDate,
          dueDate,
          amount,
          taxAmount,
          totalAmount,
          status,
          notes: notes || null,
          projectId: project.id,
          customerId,
          companyId,
        },
      })
      imported++
    } catch {
      errors.push(`行${i + 1}: 登録に失敗しました（案件番号: ${projectNumber}）`)
    }
  }

  return NextResponse.json({ imported, skipped, errors })
}
