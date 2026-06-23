import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function toCsv(rows: string[][]): string {
  return rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('ja-JP')
}

// Japanese field name → DB value extractor per source
type RowExtractor = (record: Record<string, unknown>) => Record<string, string>

const FIELD_MAP: Record<string, RowExtractor> = {
  projects: (p) => ({
    '案件番号': String(p.projectNumber ?? ''),
    '案件名': String(p.name ?? ''),
    '状態': String(p.status ?? ''),
    '顧客名': String((p.customer as Record<string, unknown> | null)?.name ?? ''),
    '住所': String(p.address ?? ''),
    '着工日': fmtDate(p.startDate as string | null),
    '竣工日': fmtDate(p.endDate as string | null),
    '契約金額': String(p.contractAmount ?? ''),
  }),
  orders: (o) => ({
    '発注番号': String(o.orderNumber ?? ''),
    '件名': String(o.subject ?? ''),
    '発注先': String((o.supplier as Record<string, unknown> | null)?.name ?? ''),
    '発注金額': String(o.totalAmount ?? ''),
    '状態': String(o.status ?? ''),
    '発注日': fmtDate(o.orderDate as string | null),
  }),
  invoices: (inv) => ({
    '請求書番号': String(inv.invoiceNumber ?? ''),
    '件名': String((inv.project as Record<string, unknown> | null)?.name ?? ''),
    '顧客名': String((inv.customer as Record<string, unknown> | null)?.name ?? ''),
    '金額': String(inv.totalAmount ?? ''),
    '状態': String(inv.status ?? ''),
    '請求日': fmtDate(inv.invoiceDate as string | null),
    '支払期限': fmtDate(inv.dueDate as string | null),
  }),
  schedules: (s) => ({
    '工程名': String(s.name ?? ''),
    '担当者': String((s.assignee as Record<string, unknown> | null)?.name ?? ''),
    '開始日': fmtDate(s.startDate as string | null),
    '終了日': fmtDate(s.endDate as string | null),
    '状態': String(s.status ?? ''),
    '進捗率': String(s.progress ?? ''),
  }),
  'work-reports': (w) => ({
    '報告日': fmtDate(w.reportDate as string | null),
    '案件名': String((w.project as Record<string, unknown> | null)?.name ?? ''),
    '報告者': String((w.reporter as Record<string, unknown> | null)?.name ?? ''),
    '状態': String(w.status ?? ''),
    '作業内容': String(w.content ?? ''),
    '天気': String(w.weather ?? ''),
    '作業人数': String(w.workerCount ?? ''),
  }),
  inspections: (i) => ({
    '検査日': fmtDate((i.actualDate ?? i.scheduledDate) as string | null),
    '検査種別': String(i.type ?? ''),
    '検査名': String(i.name ?? ''),
    '結果': String(i.status ?? ''),
    '不具合数': String((i.defects as unknown[])?.length ?? ''),
    '検査担当': String((i.inspector as Record<string, unknown> | null)?.name ?? ''),
  }),
  costs: (b) => ({
    '費目': String(b.category ?? ''),
    '予算金額': String(b.amount ?? ''),
    '発注金額': String(b.orderedAmount ?? ''),
    '請求金額': String(b.invoicedAmount ?? ''),
    '支払金額': String(b.paidAmount ?? ''),
    '案件名': String((b.project as Record<string, unknown> | null)?.name ?? ''),
  }),
}

async function fetchRecords(
  source: string,
  companyId: string
): Promise<Record<string, unknown>[]> {
  switch (source) {
    case 'projects':
      return prisma.project.findMany({
        where: { companyId, deletedAt: null },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      }) as Promise<Record<string, unknown>[]>
    case 'orders':
      return prisma.order.findMany({
        where: { companyId },
        include: { supplier: true },
        orderBy: { createdAt: 'desc' },
      }) as Promise<Record<string, unknown>[]>
    case 'invoices':
      return prisma.invoice.findMany({
        where: { companyId },
        include: { customer: true, project: true },
        orderBy: { createdAt: 'desc' },
      }) as Promise<Record<string, unknown>[]>
    case 'schedules':
      return prisma.schedule.findMany({
        where: { project: { companyId } },
        include: { assignee: true },
        orderBy: { startDate: 'asc' },
      }) as Promise<Record<string, unknown>[]>
    case 'work-reports':
      return prisma.workReport.findMany({
        where: { companyId },
        include: { project: true, reporter: true },
        orderBy: { reportDate: 'desc' },
      }) as Promise<Record<string, unknown>[]>
    case 'inspections':
      return prisma.inspection.findMany({
        where: { project: { companyId } },
        include: { inspector: true, defects: true },
        orderBy: { createdAt: 'desc' },
      }) as Promise<Record<string, unknown>[]>
    case 'costs':
      return prisma.budget.findMany({
        where: { companyId },
        include: { project: true },
        orderBy: { createdAt: 'desc' },
      }) as Promise<Record<string, unknown>[]>
    default:
      return []
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as { companyId: string }).companyId

  const body = await req.json() as { source?: string; fields?: string[]; reportName?: string }
  const { source, fields } = body

  if (!source || !fields || fields.length === 0) {
    return NextResponse.json({ error: 'source と fields は必須です' }, { status: 400 })
  }

  const extractor = FIELD_MAP[source]
  if (!extractor) {
    return NextResponse.json({ error: '不明なデータソースです' }, { status: 400 })
  }

  const records = await fetchRecords(source, companyId)
  const header = fields
  const rows = records.map((record) => {
    const mapped = extractor(record)
    return fields.map((f) => mapped[f] ?? '')
  })

  const bom = '\uFEFF'
  const csv = bom + toCsv([header, ...rows])
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="custom-report-${date}.csv"`,
    },
  })
}
