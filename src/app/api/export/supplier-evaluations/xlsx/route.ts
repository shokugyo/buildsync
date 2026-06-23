import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId

  const evaluations = await prisma.supplierEvaluation.findMany({
    where: { companyId },
    include: { supplier: { select: { id: true, name: true } } },
  })

  const grouped = new Map<string, {
    supplierId: string
    supplierName: string
    count: number
    qualityScore: number
    costScore: number
    scheduleScore: number
    safetyScore: number
    overallScore: number
  }>()

  for (const ev of evaluations) {
    const key = ev.supplierId
    if (!grouped.has(key)) {
      grouped.set(key, {
        supplierId: ev.supplierId,
        supplierName: ev.supplier.name,
        count: 0,
        qualityScore: 0,
        costScore: 0,
        scheduleScore: 0,
        safetyScore: 0,
        overallScore: 0,
      })
    }
    const g = grouped.get(key)!
    g.count++
    g.qualityScore += ev.qualityScore
    g.costScore += ev.costScore
    g.scheduleScore += ev.scheduleScore
    g.safetyScore += ev.safetyScore
    g.overallScore += ev.overallScore
  }

  const rows = Array.from(grouped.values())
    .map((g) => ({
      supplierId: g.supplierId,
      supplierName: g.supplierName,
      count: g.count,
      avgQualityScore: Math.round((g.qualityScore / g.count) * 10) / 10,
      avgCostScore: Math.round((g.costScore / g.count) * 10) / 10,
      avgScheduleScore: Math.round((g.scheduleScore / g.count) * 10) / 10,
      avgSafetyScore: Math.round((g.safetyScore / g.count) * 10) / 10,
      avgOverallScore: Math.round((g.overallScore / g.count) * 10) / 10,
    }))
    .sort((a, b) => b.avgOverallScore - a.avgOverallScore)

  const data = [
    ['協力会社名', '評価件数', '品質スコア(平均)', 'コストスコア(平均)', '工期スコア(平均)', '安全スコア(平均)', '総合スコア(平均)'],
    ...rows.map((r) => [
      r.supplierName,
      r.count,
      r.avgQualityScore,
      r.avgCostScore,
      r.avgScheduleScore,
      r.avgSafetyScore,
      r.avgOverallScore,
    ]),
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, '協力会社評価')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="supplier-evaluations_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
