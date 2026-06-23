import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const headers = ['案件番号', '請求先', '請求日', '支払期限', '税抜金額', 'ステータス', '備考']
  const example = ['P-0001', '株式会社サンプル', '2024-01-31', '2024-02-29', '1000000', '未請求', '特記事項なし']

  const csv = '\uFEFF' + headers.join(',') + '\r\n' + example.join(',') + '\r\n'

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="invoices_template.csv"',
    },
  })
}
