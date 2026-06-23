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

    const subject = (row['件名'] || '').trim()
    const projectNumber = (row['案件番号'] || '').trim()
    const supplierName = (row['発注先'] || '').trim()
    const workType = (row['工種'] || '').trim()
    const orderDateStr = (row['発注日'] || '').trim()
    const deliveryDateStr = (row['納期'] || '').trim()
    const amountStr = (row['税抜金額'] || '').trim()
    const notes = (row['備考'] || '').trim()

    if (!subject) {
      errors.push(`行${i + 1}: 件名が空です`)
      continue
    }

    // Resolve project
    let project = null
    if (projectNumber) {
      project = await prisma.project.findFirst({
        where: { companyId, projectNumber },
      })
    }
    if (!project) {
      errors.push(`行${i + 1}: 案件番号「${projectNumber}」が見つかりません`)
      skipped++
      continue
    }

    // Resolve supplier (optional)
    let supplierId: string | null = null
    if (supplierName) {
      const supplier = await prisma.supplier.findFirst({
        where: { companyId, name: supplierName },
      })
      if (supplier) supplierId = supplier.id
    }

    // Parse amount
    const amount = parseFloat(amountStr.replace(/,/g, '')) || 0
    const taxAmount = Math.round(amount * 0.1)
    const totalAmount = amount + taxAmount

    // Parse dates
    const orderDate = orderDateStr ? new Date(orderDateStr) : null
    const deliveryDate = deliveryDateStr ? new Date(deliveryDateStr) : null

    // Auto-generate orderNumber
    const count = await prisma.order.count({ where: { companyId } })
    const orderNumber = `O-${String(count + 1).padStart(4, '0')}`

    try {
      await prisma.order.create({
        data: {
          orderNumber,
          subject,
          workType: workType || null,
          orderDate,
          deliveryDate,
          amount,
          taxAmount,
          totalAmount,
          status: '未発注',
          notes: notes || null,
          projectId: project.id,
          supplierId,
          companyId,
        },
      })
      imported++
    } catch {
      errors.push(`行${i + 1}: 登録に失敗しました（${subject}）`)
    }
  }

  return NextResponse.json({ imported, skipped, errors })
}
