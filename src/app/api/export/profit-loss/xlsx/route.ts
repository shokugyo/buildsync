import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import * as XLSX from 'xlsx'

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year') || String(new Date().getFullYear())

  const apiRes = await fetch(
    `${req.nextUrl.origin}/api/reports/profit-loss?year=${year}`,
    { headers: { cookie: req.headers.get('cookie') || '' } }
  )

  if (!apiRes.ok) return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })

  const { months, annual } = await apiRes.json()

  const data: (string | number)[][] = [
    [`${year}年 月次収支レポート`],
    [],
    ['月', '売上（税込）', '原価', '粗利', '粗利率(%)'],
    ...months.map((m: { month: number; revenue: number; cost: number; grossProfit: number; grossMarginPct: number }) => [
      MONTH_LABELS[m.month - 1],
      m.revenue,
      m.cost,
      m.grossProfit,
      parseFloat(m.grossMarginPct.toFixed(1)),
    ]),
    ['年間合計', annual.revenue, annual.cost, annual.grossProfit, parseFloat(annual.grossMarginPct.toFixed(1))],
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, `${year}年収支`)
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="profit-loss-${year}.xlsx"`,
    },
  })
}
