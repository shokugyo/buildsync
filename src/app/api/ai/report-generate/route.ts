import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface ReportBody {
  date: string
  weather: string
  workerCount: number
  progress: string
  issues?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ReportBody
    const { date, weather, workerCount, progress, issues } = body

    if (!date || !weather || !workerCount || !progress) {
      return NextResponse.json(
        { error: 'date, weather, workerCount, progress are required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey || apiKey === 'your_api_key_here') {
      // Mock response when API key is not configured
      const mockText = `作業報告書

【日付】${date}
【天候】${weather}
【作業員数】${workerCount}名

【作業進捗】
${progress}

${issues ? `【問題・課題】\n${issues}\n\n` : ''}本日の作業は予定通り進行しました。安全管理を徹底し、全作業員が無事に業務を完了いたしました。引き続き品質管理と安全確保に努めてまいります。`
      return NextResponse.json({ generated: mockText })
    }

    const client = new Anthropic({ apiKey })

    const prompt = `以下の情報をもとに、建設現場の作業日報（報告書）の文章を生成してください。

日付: ${date}
天候: ${weather}
作業員数: ${workerCount}名
作業進捗: ${progress}
${issues ? `問題・課題: ${issues}` : ''}

報告書は正式な業務文書として、簡潔かつ明確に記述してください。`

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const generated = textBlock && textBlock.type === 'text' ? textBlock.text : ''

    return NextResponse.json({ generated })
  } catch (error) {
    console.error('report-generate error:', error)
    return NextResponse.json(
      { error: '報告書の生成に失敗しました' },
      { status: 500 }
    )
  }
}
