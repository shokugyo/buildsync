import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const headers = ['業者名', '種別', '住所', '電話番号', 'メールアドレス', '担当者名', '備考']
  const example = ['株式会社サンプル協力会社', '協力会社', '東京都品川区2-2-2', '03-1111-1111', 'contact@example.com', '山田 太郎', '']

  const csv = '\uFEFF' + headers.join(',') + '\r\n' + example.join(',') + '\r\n'

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="suppliers_template.csv"',
    },
  })
}
