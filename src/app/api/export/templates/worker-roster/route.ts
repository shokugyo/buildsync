import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const headers = ['氏名', '所属会社', '職種', '生年月日', '入場日', '退場日', '資格', '血液型', '緊急連絡先', '緊急連絡先電話', '保険種別']
  const example = ['山田 太郎', '株式会社サンプル建設', '大工', '1980-04-01', '2026-07-01', '', '足場作業主任者', 'A', '山田 花子', '090-0000-0000', '労災保険']

  const csv = '\uFEFF' + headers.join(',') + '\r\n' + example.join(',') + '\r\n'

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="worker_roster_template.csv"',
    },
  })
}
