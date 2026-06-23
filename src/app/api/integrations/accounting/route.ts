import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 会計システムAPI連携 (freee / 弥生 / 勘定奉行 の簡易モック)
// 本番環境では各サービスのOAuth認証フローが必要

interface AccountingConfig {
  service: 'freee' | 'yayoi' | 'kanjo_bugyo'
  apiKey?: string
  companyId?: string
  connected: boolean
}

// GET: 連携状態取得
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'sync-preview') {
    // 同期プレビュー: 未同期のデータを取得
    const companyId = (session.user as any).companyId
    const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [orders, invoices] = await Promise.all([
      prisma.order.findMany({
        where: { companyId, orderDate: { gte: new Date(from) }, status: { in: ['発注済', '完了'] } },
        include: { supplier: { select: { name: true } }, project: { select: { name: true, projectNumber: true } } },
        take: 50,
      }),
      prisma.invoice.findMany({
        where: { companyId, invoiceDate: { gte: new Date(from) }, status: { in: ['送付済', '入金済'] } },
        include: { customer: { select: { name: true } }, project: { select: { name: true, projectNumber: true } } },
        take: 50,
      }),
    ])

    return NextResponse.json({
      orders: orders.map(o => ({
        id: o.id,
        type: '仕入',
        date: o.orderDate,
        amount: o.totalAmount,
        account: '外注費',
        counterparty: o.supplier?.name,
        project: o.project.projectNumber,
        description: o.subject,
      })),
      invoices: invoices.map(i => ({
        id: i.id,
        type: '売上',
        date: i.invoiceDate,
        amount: i.totalAmount,
        account: '売上高',
        counterparty: i.customer?.name,
        project: i.project.projectNumber,
        description: i.invoiceNumber,
      })),
      total: orders.length + invoices.length,
    })
  }

  return NextResponse.json({
    services: [
      { id: 'freee', name: 'freee会計', connected: false, logo: '🟢', description: 'freee APIを使ったリアルタイム同期' },
      { id: 'yayoi', name: '弥生会計', connected: false, logo: '🔵', description: 'CSV経由でのデータ連携' },
      { id: 'kanjo_bugyo', name: '勘定奉行', connected: false, logo: '🟠', description: 'CSVインポート形式で連携' },
    ],
    note: '本番環境での利用にはOAuth認証設定が必要です',
  })
}

// POST: 同期実行
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { action, service, items } = body

  if (action === 'connect') {
    // OAuth連携開始（実際のfree APIではOAuthフロー）
    const authUrls: Record<string, string> = {
      freee: 'https://accounts.freee.co.jp/oauth/authorize',
      yayoi: 'https://www.yayoi-kk.co.jp/',
      kanjo_bugyo: 'https://www.obc.co.jp/',
    }
    return NextResponse.json({
      success: true,
      authUrl: authUrls[service] || '#',
      message: `${service}の連携設定画面を開きます。実際の連携にはOAuth認証が必要です。`,
    })
  }

  if (action === 'sync') {
    // 仕訳データの同期（モック）
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'itemsは必須です' }, { status: 400 })
    }
    // 実際はfree API / 弥生クラウドAPIへPOST
    return NextResponse.json({
      success: true,
      synced: items.length,
      failed: 0,
      message: `${items.length}件の仕訳データを${service}に同期しました（デモ）`,
      timestamp: new Date().toISOString(),
    })
  }

  return NextResponse.json({ error: '不正なアクション' }, { status: 400 })
}
