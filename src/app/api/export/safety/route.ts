import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const BOM = '\uFEFF'

function toCsv(rows: string[][]): string {
  return rows
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n')
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('ja-JP')
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) {
    return NextResponse.json({ error: '会社情報が取得できません' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'all'
  const projectId = searchParams.get('projectId') || undefined

  try {
    if (type === 'kyk') {
      return await exportKyk(companyId, projectId)
    } else if (type === 'kyy' || type === 'ky') {
      return await exportKyy(companyId, projectId)
    } else if (type === 'roster') {
      return await exportRoster(companyId, projectId)
    } else if (type === 'all') {
      return await exportAll(companyId, projectId)
    } else {
      // default: return施工体制台帳 (kyk)
      return await exportKyk(companyId, projectId)
    }
  } catch (err) {
    console.error('Safety export error:', err)
    return NextResponse.json({ error: 'エクスポートに失敗しました' }, { status: 500 })
  }
}

// ── Helper: fetch roster rows as string[][] ───────────────────────────────────
async function fetchRosterRows(companyId: string, projectId?: string): Promise<string[][]> {
  const rosters = await prisma.workerRoster.findMany({
    where: {
      companyId,
      ...(projectId ? { projectId } : {}),
    },
    include: {
      project: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (rosters.length === 0) {
    return [
      ['山田 太郎', 'ヤマダ タロウ', '1980/04/01', '山田工務店', '大工', '大工技能士2級', '山田 花子 090-0000-0001'],
      ['鈴木 一郎', 'スズキ イチロウ', '1975/08/15', '鈴木電気', '電気工', '第二種電気工事士', '鈴木 京子 090-0000-0002'],
    ]
  }
  return rosters.map(r => [
    r.workerName,
    '',
    fmtDate(r.birthDate),
    r.company,
    r.jobType ?? '',
    r.certifications ?? '',
    r.emergencyContact ? `${r.emergencyContact} ${r.emergencyPhone ?? ''}`.trim() : '',
  ])
}

// ── Helper: fetch KY activity rows as string[][] ──────────────────────────────
async function fetchKyyRows(companyId: string, projectId?: string): Promise<string[][]> {
  const activities = await prisma.kyActivity.findMany({
    where: {
      companyId,
      ...(projectId ? { projectId } : {}),
    },
    include: {
      project: { select: { name: true } },
    },
    orderBy: { activityDate: 'desc' },
  })

  if (activities.length === 0) {
    return [
      ['2024/05/10', 'サンプル工事', '田中 監督', '足場からの転落', '安全帯着用・足場点検実施', '山本 所長'],
      ['2024/05/09', 'サンプル工事', '田中 監督', '資材の落下', '飛散防止ネット設置', '山本 所長'],
    ]
  }
  return activities.map(a => [
    fmtDate(a.activityDate),
    a.project?.name ?? '',
    a.leader ?? '',
    a.risks,
    a.notes ?? '',
    a.participants ?? '',
  ])
}

// 施工体制台帳 (kyk)
async function exportKyk(companyId: string, projectId?: string): Promise<NextResponse> {
  const rosters = await prisma.workerRoster.findMany({
    where: {
      companyId,
      ...(projectId ? { projectId } : {}),
    },
    include: {
      project: { select: { name: true, projectNumber: true } },
      companyRel: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const header = ['元請会社名', '工事名', '作業員氏名', '所属会社', '職種', '入場日', '退場日']

  const rows: string[][] = rosters.length > 0
    ? rosters.map(r => [
        r.companyRel?.name ?? '',
        r.project?.name ?? '',
        r.workerName,
        r.company,
        r.jobType ?? '',
        fmtDate(r.entryDate),
        fmtDate(r.exitDate),
      ])
    : [
        ['株式会社サンプル建設', 'サンプル工事', '山田 太郎', '山田工務店', '大工', '2024/04/01', '2024/06/30'],
        ['株式会社サンプル建設', 'サンプル工事', '鈴木 一郎', '鈴木電気', '電気工', '2024/05/01', '2024/06/30'],
      ]

  const csv = BOM + toCsv([header, ...rows])
  const filename = `施工体制台帳_${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}

// KY活動記録 (ky / kyy)
async function exportKyy(companyId: string, projectId?: string): Promise<NextResponse> {
  const header = ['実施日', '案件名', '担当者', '危険予知項目', '対策', '確認者']
  const rows = await fetchKyyRows(companyId, projectId)
  const csv = BOM + toCsv([header, ...rows])
  const filename = `KY活動記録_${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}

// 作業員名簿 (roster)
async function exportRoster(companyId: string, projectId?: string): Promise<NextResponse> {
  const header = ['氏名', 'フリガナ', '生年月日', '所属会社', '職種', '保有資格', '緊急連絡先']
  const rows = await fetchRosterRows(companyId, projectId)
  const csv = BOM + toCsv([header, ...rows])
  const filename = `作業員名簿_${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}

// 全書類（roster + ky）を連結したCSV
async function exportAll(companyId: string, projectId?: string): Promise<NextResponse> {
  const [rosterRows, kyRows] = await Promise.all([
    fetchRosterRows(companyId, projectId),
    fetchKyyRows(companyId, projectId),
  ])

  const rosterHeader = ['氏名', 'フリガナ', '生年月日', '所属会社', '職種', '保有資格', '緊急連絡先']
  const kyHeader = ['実施日', '案件名', '担当者', '危険予知項目', '対策', '確認者', '']

  const allRows: string[][] = [
    ['--- 作業員名簿 ---', '', '', '', '', '', ''],
    rosterHeader,
    ...rosterRows,
    ['', '', '', '', '', '', ''],
    ['--- KY活動記録 ---', '', '', '', '', '', ''],
    kyHeader,
    ...kyRows.map(r => [...r, '']),
  ]

  const csv = BOM + toCsv(allRows)
  const filename = `安全書類一括_${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
