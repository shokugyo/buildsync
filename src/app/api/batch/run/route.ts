import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  let body: { jobId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }

  const { jobId } = body

  if (!jobId) {
    return NextResponse.json({ error: 'jobId は必須です' }, { status: 400 })
  }

  switch (jobId) {
    case 'monthly-report': {
      // Mock: aggregate project count and invoice totals
      const projectCount = Math.floor(Math.random() * 50) + 10
      const invoiceTotal = Math.floor(Math.random() * 10000000) + 1000000
      const duration = Date.now() - startTime
      return NextResponse.json({
        success: true,
        message: `月次レポートを生成しました。案件数: ${projectCount}件、請求合計: ¥${invoiceTotal.toLocaleString()}`,
        processed: projectCount,
        duration,
      })
    }

    case 'invoice-reminder': {
      // Mock: count unpaid invoices
      const unpaidCount = Math.floor(Math.random() * 15) + 1
      const duration = Date.now() - startTime
      return NextResponse.json({
        success: true,
        message: `未払い請求書 ${unpaidCount}件 にリマインドメールを送信しました`,
        processed: unpaidCount,
        duration,
      })
    }

    case 'data-cleanup': {
      // Mock: simulate old temp data cleanup
      const deletedCount = Math.floor(Math.random() * 200) + 50
      const duration = Date.now() - startTime
      return NextResponse.json({
        success: true,
        message: `90日以上前の一時データ ${deletedCount}件 を削除しました（モック）`,
        processed: deletedCount,
        duration,
      })
    }

    case 'backup': {
      // Mock: simulate database backup
      const sizeKb = Math.floor(Math.random() * 50000) + 10000
      const duration = Date.now() - startTime
      return NextResponse.json({
        success: true,
        message: `データベースバックアップが完了しました（${(sizeKb / 1024).toFixed(1)} MB）（モック）`,
        processed: 1,
        duration,
      })
    }

    default:
      return NextResponse.json({ error: `不明なジョブID: ${jobId}` }, { status: 400 })
  }
}
