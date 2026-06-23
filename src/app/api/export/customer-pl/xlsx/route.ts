import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year') || String(new Date().getFullYear())

  const apiRes = await fetch(
    `${req.nextUrl.origin}/api/reports/customer-pl?year=${year}`,
    { headers: { cookie: req.headers.get('cookie') || '' } }
  )

  if (!apiRes.ok) return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })

  const { rows } = await apiRes.json()

  type Row = { customerName: string; projectCount: number; revenue: number; cost: number; grossProfit: number; margin: number }

  const totalRevenue = rows.reduce((s: number, r: Row) => s + r.revenue, 0)
  const totalCost = rows.reduce((s: number, r: Row) => s + r.cost, 0)
  const totalGrossProfit = totalRevenue - totalCost
  const totalMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0

  const data: (string | number)[][] = [
    [`${year}年 顧客別収支レポート`],
    [],
    ['顧客名', '案件数', '売上合計', '原価合計', '粗利', '粗利率(%)'],
    ...rows.map((r: Row) => [
      r.customerName,
      r.projectCount,
      r.revenue,
      r.cost,
      r.grossProfit,
      parseFloat(r.margin.toFixed(1)),
    ]),
    ['合計', rows.reduce((s: number, r: Row) => s + r.projectCount, 0), totalRevenue, totalCost, totalGrossProfit, parseFloat(totalMargin.toFixed(1))],
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, `${year}年顧客別収支`)
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="customer-pl-${year}.xlsx"`,
    },
  })
}
