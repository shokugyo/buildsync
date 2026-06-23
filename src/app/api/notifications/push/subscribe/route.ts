import { NextRequest, NextResponse } from 'next/server'

// POST: PushSubscription を保存
// { endpoint, keys: { p256dh, auth } } を受け取る
// PushSubscription モデルがないため、現在は成功レスポンスのみ返す（本番実装時はDBに保存）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      endpoint?: string
      keys?: { p256dh?: string; auth?: string }
    }

    if (!body.endpoint) {
      return NextResponse.json({ error: 'endpoint は必須です' }, { status: 400 })
    }

    // TODO: DB（PushSubscriptionモデル）が追加されたらここで保存する
    // await prisma.pushSubscription.upsert({ ... })
    console.log('[Push Subscribe]', { endpoint: body.endpoint?.slice(0, 60) + '...' })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'リクエストの解析に失敗しました' }, { status: 400 })
  }
}
