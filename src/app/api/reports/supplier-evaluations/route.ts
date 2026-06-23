import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  const result = Array.from(grouped.values()).map((g) => ({
    supplierId: g.supplierId,
    supplierName: g.supplierName,
    count: g.count,
    avgQualityScore: Math.round((g.qualityScore / g.count) * 10) / 10,
    avgCostScore: Math.round((g.costScore / g.count) * 10) / 10,
    avgScheduleScore: Math.round((g.scheduleScore / g.count) * 10) / 10,
    avgSafetyScore: Math.round((g.safetyScore / g.count) * 10) / 10,
    avgOverallScore: Math.round((g.overallScore / g.count) * 10) / 10,
  }))

  result.sort((a, b) => b.avgOverallScore - a.avgOverallScore)

  return NextResponse.json(result)
}
