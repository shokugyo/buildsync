import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface ChatBody {
  message: string
  context?: string
}

type ChatResponse =
  | { type: 'navigate'; url: string; message: string }
  | { type: 'answer'; message: string }
  | { type: 'action'; action: string; params: Record<string, unknown>; message: string }

const SYSTEM_PROMPT = `あなたはBuildSyncというシステムのAIアシスタントです。BuildSyncは建設業向けSaaSです。

ユーザーのメッセージを解析し、必ず以下のいずれかのJSON形式で応答してください（JSONのみ、説明文は不要）：

1. 画面遷移の場合:
{"type": "navigate", "url": "/path", "message": "〇〇に移動します"}

2. 情報回答の場合:
{"type": "answer", "message": "回答内容"}

3. 操作指示の場合:
{"type": "action", "action": "アクション名", "params": {}, "message": "操作の説明"}

利用可能なルーティング:
- /dashboard: ダッシュボード
- /projects: 案件一覧
- /projects/new: 新規案件作成
- /schedule: スケジュール
- /photos: 写真管理
- /chat: チャット
- /work-reports: 作業報告書
- /invoices: 請求書
- /orders: 発注管理
- /costs: 原価管理
- /reports: レポート
- /leads: 見込み客
- /suppliers: 仕入先
- /customers: 顧客管理
- /settings: 設定

例：
- 「案件一覧を見たい」→ {"type": "navigate", "url": "/projects", "message": "案件一覧に移動します"}
- 「新しい案件を作りたい」→ {"type": "navigate", "url": "/projects/new", "message": "案件作成画面に移動します"}
- 「写真を管理したい」→ {"type": "navigate", "url": "/photos", "message": "写真管理画面に移動します"}
- 「今日の予定は？」→ {"type": "answer", "message": "スケジュール画面で確認できます。"}

必ずJSONのみで応答してください。`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatBody
    const { message, context } = body

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey || apiKey === 'your_api_key_here') {
      // Mock response based on simple keyword matching
      const mockResponse = getMockResponse(message)
      return NextResponse.json(mockResponse)
    }

    const client = new Anthropic({ apiKey })

    const userContent = context
      ? `コンテキスト: ${context}\n\nユーザーメッセージ: ${message}`
      : message

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const text = textBlock && textBlock.type === 'text' ? textBlock.text.trim() : ''

    try {
      // Extract JSON from response (handle code blocks)
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text
      const parsed = JSON.parse(jsonStr) as ChatResponse
      return NextResponse.json(parsed)
    } catch {
      // Fallback: return as answer if JSON parsing fails
      return NextResponse.json({
        type: 'answer',
        message: text || 'ご質問の意図が読み取れませんでした。もう少し詳しく教えてください。',
      })
    }
  } catch (error) {
    console.error('chat error:', error)
    return NextResponse.json(
      {
        type: 'answer',
        message: 'AIとの通信に失敗しました。しばらく経ってから再度お試しください。',
      },
      { status: 200 }
    )
  }
}

function getMockResponse(message: string): ChatResponse {
  const msg = message.toLowerCase()

  if (msg.includes('案件') && (msg.includes('一覧') || msg.includes('見たい') || msg.includes('確認'))) {
    return { type: 'navigate', url: '/projects', message: '案件一覧に移動します' }
  }
  if (msg.includes('案件') && (msg.includes('新規') || msg.includes('作り') || msg.includes('追加'))) {
    return { type: 'navigate', url: '/projects/new', message: '案件作成画面に移動します' }
  }
  if (msg.includes('ダッシュボード') || msg.includes('トップ') || msg.includes('ホーム')) {
    return { type: 'navigate', url: '/dashboard', message: 'ダッシュボードに移動します' }
  }
  if (msg.includes('スケジュール') || msg.includes('予定')) {
    return { type: 'navigate', url: '/schedule', message: 'スケジュール画面に移動します' }
  }
  if (msg.includes('写真')) {
    return { type: 'navigate', url: '/photos', message: '写真管理画面に移動します' }
  }
  if (msg.includes('報告書') || msg.includes('日報')) {
    return { type: 'navigate', url: '/work-reports', message: '作業報告書画面に移動します' }
  }
  if (msg.includes('請求書') || msg.includes('請求')) {
    return { type: 'navigate', url: '/invoices', message: '請求書画面に移動します' }
  }
  if (msg.includes('発注') || msg.includes('注文')) {
    return { type: 'navigate', url: '/orders', message: '発注管理画面に移動します' }
  }
  if (msg.includes('原価') || msg.includes('コスト')) {
    return { type: 'navigate', url: '/costs', message: '原価管理画面に移動します' }
  }
  if (msg.includes('顧客') || msg.includes('お客')) {
    return { type: 'navigate', url: '/customers', message: '顧客管理画面に移動します' }
  }
  if (msg.includes('仕入') || msg.includes('サプライヤー')) {
    return { type: 'navigate', url: '/suppliers', message: '仕入先管理画面に移動します' }
  }
  if (msg.includes('設定')) {
    return { type: 'navigate', url: '/settings', message: '設定画面に移動します' }
  }
  if (msg.includes('レポート') || msg.includes('報告')) {
    return { type: 'navigate', url: '/reports', message: 'レポート画面に移動します' }
  }
  if (msg.includes('チャット')) {
    return { type: 'navigate', url: '/chat', message: 'チャット画面に移動します' }
  }

  return {
    type: 'answer',
    message: 'ご質問の内容を確認しました。具体的な操作や画面への移動をご希望の場合は、「案件一覧を見たい」「新しい案件を作りたい」のようにお伝えください。',
  }
}
