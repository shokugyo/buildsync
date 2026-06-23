import { NextRequest, NextResponse } from 'next/server'

const STORAGE_SERVICES = [
  {
    id: 'google-drive',
    name: 'Google Drive',
    connected: false,
    icon: '📁',
    oauthUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    connected: false,
    icon: '📦',
    oauthUrl: 'https://www.dropbox.com/oauth2/authorize',
  },
  {
    id: 'box',
    name: 'Box',
    connected: false,
    icon: '📋',
    oauthUrl: 'https://account.box.com/api/oauth2/authorize',
  },
]

// GET: 外部ストレージ連携状態を返す
export async function GET() {
  return NextResponse.json({
    services: STORAGE_SERVICES.map(({ id, name, connected, icon }) => ({
      id,
      name,
      connected,
      icon,
    })),
  })
}

// POST action=connect: OAuth認証URL生成（モック）
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, serviceId } = body

  if (action === 'connect') {
    const service = STORAGE_SERVICES.find((s) => s.id === serviceId)
    if (!service) {
      return NextResponse.json({ error: 'サービスが見つかりません' }, { status: 404 })
    }

    // モック: 実際にはOAuthクライアントIDやスコープを付与してリダイレクト
    const authUrl = service.oauthUrl

    return NextResponse.json({
      authUrl,
      message: `${service.name} のOAuthフローが必要です（デモ）`,
    })
  }

  return NextResponse.json({ error: '不正なアクション' }, { status: 400 })
}
