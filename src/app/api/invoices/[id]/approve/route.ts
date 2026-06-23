import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasRole, APPROVER_ROLES } from '@/lib/permissions'

// POST /api/invoices/[id]/approve
// body: { action: '承認' | '差し戻し', comment?: string }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  if (!hasRole(session, APPROVER_ROLES)) {
    return NextResponse.json({ error: '承認権限が必要です' }, { status: 403 })
  }

  const body = await req.json()
  const action: string = body.action
  const comment: string | undefined = body.comment

  if (action !== '承認' && action !== '差し戻し') {
    return NextResponse.json({ error: 'action は "承認" または "差し戻し" を指定してください' }, { status: 400 })
  }

  const companyId = (session.user as any).companyId as string
  const userId = (session.user as any).id as string

  // 請求書取得（同一会社チェック）
  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, companyId },
    include: { approvals: { orderBy: { createdAt: 'asc' } } },
  })

  if (!invoice) {
    return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })
  }

  if (invoice.status !== '承認依頼中') {
    return NextResponse.json({ error: 'この請求書は承認依頼中ではありません' }, { status: 400 })
  }

  try {
    if (action === '差し戻し') {
      // 差し戻し処理
      await prisma.invoiceApproval.create({
        data: {
          invoiceId: invoice.id,
          approverId: userId,
          level: 1,
          action: '差し戻し',
          comment: comment ?? null,
        },
      })

      const updated = await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: '差し戻し',
          rejectReason: comment ?? null,
        },
        include: {
          project: { select: { id: true, name: true, projectNumber: true } },
          customer: { select: { id: true, name: true } },
          items: { orderBy: { sortOrder: 'asc' } },
          approvals: { include: { approver: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
        },
      })

      return NextResponse.json(updated)
    }

    // 承認処理
    const threshold = 1_000_000 // 100万円
    const needsTwoLevels = invoice.totalAmount >= threshold

    if (!needsTwoLevels) {
      // 単一承認で完了
      await prisma.invoiceApproval.create({
        data: {
          invoiceId: invoice.id,
          approverId: userId,
          level: 1,
          action: '承認',
          comment: comment ?? null,
        },
      })

      const updated = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: '承認済' },
        include: {
          project: { select: { id: true, name: true, projectNumber: true } },
          customer: { select: { id: true, name: true } },
          items: { orderBy: { sortOrder: 'asc' } },
          approvals: { include: { approver: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
        },
      })

      return NextResponse.json(updated)
    }

    // 2段階承認が必要な場合
    const level1 = invoice.approvals.find((a) => a.level === 1 && a.action === '承認')

    if (!level1) {
      // レベル1承認をまだ行っていない → レベル1として記録（status は引き続き承認依頼中）
      await prisma.invoiceApproval.create({
        data: {
          invoiceId: invoice.id,
          approverId: userId,
          level: 1,
          action: '承認',
          comment: comment ?? null,
        },
      })

      const updated = await prisma.invoice.findUnique({
        where: { id: invoice.id },
        include: {
          project: { select: { id: true, name: true, projectNumber: true } },
          customer: { select: { id: true, name: true } },
          items: { orderBy: { sortOrder: 'asc' } },
          approvals: { include: { approver: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
        },
      })

      return NextResponse.json({ ...updated, _message: 'レベル1承認完了。レベル2の承認が必要です。' })
    } else {
      // レベル1は済み → レベル2として記録 → 承認済に
      await prisma.invoiceApproval.create({
        data: {
          invoiceId: invoice.id,
          approverId: userId,
          level: 2,
          action: '承認',
          comment: comment ?? null,
        },
      })

      const updated = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: '承認済' },
        include: {
          project: { select: { id: true, name: true, projectNumber: true } },
          customer: { select: { id: true, name: true } },
          items: { orderBy: { sortOrder: 'asc' } },
          approvals: { include: { approver: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
        },
      })

      return NextResponse.json(updated)
    }
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '承認処理に失敗しました' }, { status: 500 })
  }
}

// GET /api/invoices/[id]/approve  — 承認履歴取得
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const companyId = (session.user as any).companyId as string

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, companyId },
    select: { id: true },
  })
  if (!invoice) return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })

  const approvals = await prisma.invoiceApproval.findMany({
    where: { invoiceId: params.id },
    include: { approver: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(approvals)
}
