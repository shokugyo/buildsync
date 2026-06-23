import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const body = await req.json()
  const rows = body.rows
  const projectId = body.projectId || searchParams.get('projectId') || ''

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'データがありません' }, { status: 400 })
  }

  const companyId = (session.user as any).companyId
  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    const workerName = row['氏名'] || row['作業員名'] || row['name'] || ''
    const company = row['所属会社'] || row['会社名'] || row['company'] || ''
    const targetProjectId = projectId || ''

    if (!workerName.trim()) {
      errors.push(`行${rowNum}: 氏名は必須です`)
      continue
    }
    if (!company.trim()) {
      errors.push(`行${rowNum}: 所属会社は必須です`)
      continue
    }
    if (!targetProjectId) {
      errors.push(`行${rowNum}: 案件IDが指定されていません`)
      continue
    }

    try {
      // Check for duplicate
      const existing = await prisma.workerRoster.findFirst({
        where: { workerName: workerName.trim(), company: company.trim(), projectId: targetProjectId, companyId },
      })
      if (existing) {
        skipped++
        continue
      }

      const birthDateStr = row['生年月日'] || row['birthDate'] || ''
      const entryDateStr = row['入場日'] || row['entryDate'] || ''
      const exitDateStr = row['退場日'] || row['exitDate'] || ''

      await prisma.workerRoster.create({
        data: {
          workerName: workerName.trim(),
          company: company.trim(),
          projectId: targetProjectId,
          companyId,
          jobType: row['職種'] || row['jobType'] || null,
          certifications: row['資格'] || row['certifications'] || null,
          bloodType: row['血液型'] || row['bloodType'] || null,
          emergencyContact: row['緊急連絡先'] || row['emergencyContact'] || null,
          emergencyPhone: row['緊急連絡先電話'] || row['emergencyPhone'] || null,
          insuranceType: row['保険種別'] || row['insuranceType'] || null,
          birthDate: birthDateStr ? new Date(birthDateStr) : null,
          entryDate: entryDateStr ? new Date(entryDateStr) : null,
          exitDate: exitDateStr ? new Date(exitDateStr) : null,
        },
      })
      imported++
    } catch {
      errors.push(`行${rowNum}: インポートに失敗しました`)
    }
  }

  return NextResponse.json({ imported, skipped, errors })
}
