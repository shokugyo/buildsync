import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(h => {
          const v = row[h]
          if (v === null || v === undefined) return ''
          const s = String(v)
          return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join(',')
    ),
  ]
  return '\uFEFF' + lines.join('\r\n')
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const companyId = (session.user as any).companyId

  let csv = ''
  let filename = 'export.csv'

  if (type === 'projects') {
    const rows = await prisma.project.findMany({
      where: { companyId },
      include: { customer: { select: { name: true } }, manager: { select: { name: true } } },
      orderBy: { projectNumber: 'asc' },
    })
    csv = toCsv(
      rows.map(r => ({
        案件番号: r.projectNumber,
        案件名: r.name,
        ステータス: r.status,
        顧客名: r.customer?.name ?? '',
        担当者: r.manager?.name ?? '',
        工事場所: r.address ?? '',
        工事種別: r.workType ?? '',
        契約金額: r.contractAmount ?? '',
        開始日: r.startDate ? r.startDate.toISOString().slice(0, 10) : '',
        終了日: r.endDate ? r.endDate.toISOString().slice(0, 10) : '',
        竣工予定日: r.deliveryDate ? r.deliveryDate.toISOString().slice(0, 10) : '',
        備考: r.notes ?? '',
        登録日: r.createdAt.toISOString().slice(0, 10),
      }))
    )
    filename = 'projects.csv'
  } else if (type === 'orders') {
    const rows = await prisma.order.findMany({
      where: { project: { companyId } },
      include: { project: { select: { name: true, projectNumber: true } } },
      orderBy: { createdAt: 'desc' },
    })
    csv = toCsv(
      rows.map(r => ({
        案件番号: r.project?.projectNumber ?? '',
        案件名: r.project?.name ?? '',
        発注件名: r.subject,
        ステータス: r.status,
        金額: r.amount ?? '',
        消費税: r.taxAmount ?? '',
        合計金額: r.totalAmount ?? '',
        発注日: r.orderDate ? r.orderDate.toISOString().slice(0, 10) : '',
        納期: r.deliveryDate ? r.deliveryDate.toISOString().slice(0, 10) : '',
        備考: r.notes ?? '',
        登録日: r.createdAt.toISOString().slice(0, 10),
      }))
    )
    filename = 'orders.csv'
  } else if (type === 'invoices') {
    const rows = await prisma.invoice.findMany({
      where: { project: { companyId } },
      include: {
        project: { select: { name: true, projectNumber: true } },
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    csv = toCsv(
      rows.map(r => ({
        案件番号: r.project?.projectNumber ?? '',
        案件名: r.project?.name ?? '',
        請求先: r.customer?.name ?? '',
        請求番号: r.invoiceNumber ?? '',
        ステータス: r.status,
        金額: r.amount ?? '',
        消費税: r.taxAmount ?? '',
        合計金額: r.totalAmount ?? '',
        請求日: r.invoiceDate ? r.invoiceDate.toISOString().slice(0, 10) : '',
        入金予定日: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : '',
        登録日: r.createdAt.toISOString().slice(0, 10),
      }))
    )
    filename = 'invoices.csv'
  } else if (type === 'attendance') {
    const rows = await prisma.workerAttendance.findMany({
      where: { companyId },
      include: { project: { select: { name: true, projectNumber: true } } },
      orderBy: { workDate: 'desc' },
    })
    csv = toCsv(
      rows.map(r => ({
        案件番号: r.project?.projectNumber ?? '',
        案件名: r.project?.name ?? '',
        氏名: r.workerName,
        所属会社: r.company ?? '',
        作業日: r.workDate.toISOString().slice(0, 10),
        入場時間: r.entryTime ?? '',
        退場時間: r.exitTime ?? '',
        作業内容: r.workContent ?? '',
        備考: r.notes ?? '',
      }))
    )
    filename = 'attendance.csv'
  } else if (type === 'defects') {
    const rows = await prisma.defect.findMany({
      where: { project: { companyId } },
      include: {
        project: { select: { name: true, projectNumber: true } },
        assignee: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    csv = toCsv(
      rows.map(r => ({
        案件番号: r.project?.projectNumber ?? '',
        案件名: r.project?.name ?? '',
        内容: r.content,
        場所: r.location ?? '',
        ステータス: r.status,
        担当者: r.assignee?.name ?? '',
        期限: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : '',
        登録日: r.createdAt.toISOString().slice(0, 10),
      }))
    )
    filename = 'defects.csv'
  } else if (type === 'suppliers') {
    const rows = await prisma.supplier.findMany({
      where: { companyId },
      include: { _count: { select: { orders: true } } },
      orderBy: { name: 'asc' },
    })
    csv = toCsv(
      rows.map(r => ({
        業者名: r.name,
        種別: r.type,
        担当者: r.contact ?? '',
        電話番号: r.phone ?? '',
        メール: r.email ?? '',
        住所: r.address ?? '',
        発注件数: r._count.orders,
        備考: r.notes ?? '',
        登録日: r.createdAt.toISOString().slice(0, 10),
      }))
    )
    filename = 'suppliers.csv'
  } else if (type === 'costs') {
    const rows = await prisma.budget.findMany({
      where: { project: { companyId } },
      include: { project: { select: { name: true, projectNumber: true, contractAmount: true } } },
      orderBy: { project: { projectNumber: 'asc' } },
    })
    csv = toCsv(
      rows.map(r => ({
        案件番号: r.project?.projectNumber ?? '',
        案件名: r.project?.name ?? '',
        費目: r.category,
        説明: r.description ?? '',
        契約金額: r.project?.contractAmount ?? '',
        予算額: r.amount,
      }))
    )
    filename = 'costs.csv'
  } else if (type === 'gross') {
    const projects = await prisma.project.findMany({
      where: { companyId },
      include: {
        budgets: { select: { amount: true } },
        customer: { select: { name: true } },
        manager: { select: { name: true } },
      },
      orderBy: { projectNumber: 'asc' },
    })
    csv = toCsv(
      projects.map(p => {
        const totalOrdered = p.budgets.reduce((s: number, b: { amount: number }) => s + b.amount, 0)
        const gross = (p.contractAmount ?? 0) - totalOrdered
        const grossRate = (p.contractAmount ?? 0) > 0
          ? Math.round((gross / (p.contractAmount ?? 1)) * 1000) / 10
          : 0
        return {
          案件番号: p.projectNumber,
          案件名: p.name,
          ステータス: p.status,
          顧客名: p.customer?.name ?? '',
          担当者: p.manager?.name ?? '',
          契約金額: p.contractAmount ?? 0,
          発注済合計: totalOrdered,
          粗利見込: gross,
          粗利率: `${grossRate}%`,
        }
      })
    )
    filename = 'gross_profit.csv'
  } else if (type === 'schedules') {
    const rows = await prisma.schedule.findMany({
      where: { project: { companyId } },
      include: {
        project: { select: { name: true, projectNumber: true } },
        assignee: { select: { name: true } },
      },
      orderBy: [{ project: { projectNumber: 'asc' } }, { startDate: 'asc' }],
    })
    csv = toCsv(
      rows.map(r => ({
        案件番号: r.project?.projectNumber ?? '',
        案件名: r.project?.name ?? '',
        工程名: r.name,
        工種: r.category ?? '',
        開始予定日: r.startDate.toISOString().slice(0, 10),
        終了予定日: r.endDate.toISOString().slice(0, 10),
        実開始日: r.actualStart ? r.actualStart.toISOString().slice(0, 10) : '',
        実終了日: r.actualEnd ? r.actualEnd.toISOString().slice(0, 10) : '',
        担当者: r.assignee?.name ?? '',
        進捗率: `${r.progress}%`,
        ステータス: r.status,
        備考: r.notes ?? '',
      }))
    )
    filename = 'schedules.csv'
  } else if (type === 'daily-reports') {
    const rows = await prisma.dailyReport.findMany({
      where: { project: { companyId } },
      include: {
        project: { select: { name: true, projectNumber: true } },
        reporter: { select: { name: true } },
      },
      orderBy: { workDate: 'desc' },
    })
    csv = toCsv(
      rows.map(r => ({
        案件番号: r.project?.projectNumber ?? '',
        案件名: r.project?.name ?? '',
        作業日: r.workDate.toISOString().slice(0, 10),
        報告者: r.reporter?.name ?? '',
        天候: r.weather ?? '',
        作業内容: r.content,
        作業人数: r.workers ?? '',
        進捗: r.progress ?? '',
        問題点: r.issues ?? '',
        翌日予定: r.nextPlan ?? '',
      }))
    )
    filename = 'daily_reports.csv'
  } else if (type === 'safety-docs') {
    const rows = await prisma.document.findMany({
      where: {
        project: { companyId },
      },
      include: {
        project: { select: { name: true, projectNumber: true } },
        uploader: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    csv = toCsv(
      rows.map(r => ({
        案件番号: r.project?.projectNumber ?? '',
        案件名: r.project?.name ?? '',
        書類名: r.name,
        ファイル名: r.fileName,
        登録者: r.uploader?.name ?? '',
        登録日: r.createdAt.toISOString().slice(0, 10),
      }))
    )
    filename = 'safety_docs.csv'
  } else if (type === 'audit') {
    const rows = await prisma.auditLog.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    })
    csv = toCsv(
      rows.map(r => ({
        日時: r.createdAt.toISOString().replace('T', ' ').slice(0, 19),
        ユーザー名: r.userName,
        操作内容: r.action,
        対象: r.target,
      }))
    )
    filename = 'audit.csv'
  } else {
    return NextResponse.json({ error: '不正なtypeです' }, { status: 400 })
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
