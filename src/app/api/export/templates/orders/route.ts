import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const headers = ['件名', '案件番号', '発注先', '工種', '発注日', '納期', '税抜金額', '備考']
  const example = ['外壁工事一式', 'P-0001', '株式会社サンプル建設', '外壁工事', '2024-01-15', '2024-03-31', '500000', '特記事項なし']

  const csv = '\uFEFF' + headers.join(',') + '\r\n' + example.join(',') + '\r\n'

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="orders_template.csv"',
    },
  })
}
