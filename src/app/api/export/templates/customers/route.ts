import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const headers = ['顧客名', '種別', '住所', '電話番号', 'メールアドレス']
  const example = ['株式会社サンプル', '法人', '東京都千代田区1-1-1', '03-0000-0000', 'info@example.com']

  const csv = '\uFEFF' + headers.join(',') + '\r\n' + example.join(',') + '\r\n'

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="customers_template.csv"',
    },
  })
}
