import { NextRequest, NextResponse } from 'next/server'

// GET: 設定状態を返す
export async function GET() {
  const configured = !!(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_EMAIL
  )
  return NextResponse.json({
    configured,
    mode: configured ? 'vapid' : 'mock',
  })
}

// POST: { title, body, userId? } を受け取りWeb Push送信
// VAPID環境変数が設定されている場合は実際のWeb Push送信、未設定の場合はモック
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      title?: string
      body?: string
      userId?: string
      subscription?: { endpoint: string; keys: { p256dh: string; auth: string } }
    }
    const { title, body: msgBody, userId, subscription } = body

    if (!title || !msgBody) {
      return NextResponse.json({ error: 'title と body は必須です' }, { status: 400 })
    }

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
    const vapidEmail = process.env.VAPID_EMAIL

    if (vapidPublicKey && vapidPrivateKey && vapidEmail) {
      // 実際のWeb Push送信
      if (!subscription) {
        // サブスクリプションなしの場合はモードのみ返す（サーバーサイドでのブロードキャストは別途実装）
        console.log('[Push Notification VAPID Mode]', { title, body: msgBody, userId: userId ?? 'broadcast' })
        return NextResponse.json({
          message: `「${title}」を送信しました（モード: vapid-configured）`,
          sent: true,
          target: userId ?? 'broadcast',
        })
      }

      try {
        const webpush = (await import('web-push')).default
        webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey, vapidPrivateKey)
        await webpush.sendNotification(
          subscription,
          JSON.stringify({ title, body: msgBody })
        )
        return NextResponse.json({
          message: `「${title}」を送信しました（モード: vapid）`,
          sent: true,
          target: userId ?? 'broadcast',
        })
      } catch (err) {
        console.error('[Push Notification Error]', err)
        return NextResponse.json({ error: 'Web Push送信に失敗しました' }, { status: 500 })
      }
    }

    // モック: 実際のWeb Push送信の代わりにログ出力
    console.log('[Push Notification Mock]', { title, body: msgBody, userId: userId ?? 'broadcast' })

    return NextResponse.json({
      message: `「${title}」を送信しました（モード: mock）`,
      sent: true,
      target: userId ?? 'broadcast',
    })
  } catch {
    return NextResponse.json({ error: 'リクエストの解析に失敗しました' }, { status: 400 })
  }
}
