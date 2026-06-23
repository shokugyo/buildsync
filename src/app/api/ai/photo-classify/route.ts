import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { photoId, description } = body as { photoId: string; description?: string }

    if (!photoId) {
      return NextResponse.json({ error: 'photoId is required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey || apiKey === 'your_api_key_here') {
      // Mock response when API key is not configured
      const mockTags = ['施工中', '安全管理', '完了箇所']
      return NextResponse.json({ tags: mockTags })
    }

    const client = new Anthropic({ apiKey })

    const prompt = description
      ? `建設現場の写真について、以下の説明があります：「${description}」\nこの写真に適切なタグを3〜5個提案してください。タグはJSON配列形式で返してください。例：["タグ1", "タグ2", "タグ3"]`
      : `建設現場の写真（ID: ${photoId}）に適切なタグを3〜5個提案してください。建設現場でよく使われるタグ（施工中、安全管理、完了箇所、基礎工事、鉄筋工事、コンクリート打設、内装工事、外壁工事など）から選んでJSON配列形式で返してください。例：["タグ1", "タグ2", "タグ3"]`

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : ''

    // Extract JSON array from the response
    const match = text.match(/\[[\s\S]*?\]/)
    let tags: string[] = ['施工中', '安全管理', '完了箇所']
    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed) && parsed.length > 0) {
          tags = parsed
        }
      } catch {
        // fallback to mock tags
      }
    }

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('photo-classify error:', error)
    return NextResponse.json(
      { tags: ['施工中', '安全管理', '完了箇所'] },
      { status: 200 }
    )
  }
}
