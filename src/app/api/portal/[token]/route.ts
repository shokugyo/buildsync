import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function resolveShare(token: string) {
  const share = await prisma.projectShareToken.findUnique({
    where: { token },
    include: {
      project: {
        include: {
          customer: { select: { id: true, name: true } },
          manager: { select: { id: true, name: true } },
          schedules: {
            orderBy: { startDate: 'asc' },
            select: { id: true, name: true, startDate: true, endDate: true, status: true, progress: true, category: true },
          },
          photos: {
            orderBy: { createdAt: 'desc' },
            take: 6,
            select: { id: true, filePath: true, comment: true, shootingType: true, createdAt: true },
          },
          defects: {
            select: { id: true, status: true },
          },
        },
      },
    },
  })
  return share
}

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const share = await resolveShare(params.token)

  if (!share) {
    return NextResponse.json({ error: 'リンクが無効または期限切れです' }, { status: 404 })
  }

  if (share.expiresAt && share.expiresAt < new Date()) {
    return NextResponse.json({ error: 'リンクが無効または期限切れです' }, { status: 410 })
  }

  const p = share.project
  const totalSchedules = p.schedules.length
  const completedSchedules = p.schedules.filter((s) => s.status === '完了').length
  const progressPct = totalSchedules > 0 ? Math.round((completedSchedules / totalSchedules) * 100) : 0

  const openDefects = p.defects.filter((d) => d.status !== '対応済').length
  const resolvedDefects = p.defects.filter((d) => d.status === '対応済').length

  return NextResponse.json({
    project: {
      id: p.id,
      projectNumber: p.projectNumber,
      name: p.name,
      status: p.status,
      address: p.address,
      workType: p.workType,
      startDate: p.startDate,
      endDate: p.endDate,
      deliveryDate: p.deliveryDate,
      notes: p.notes,
      customer: p.customer,
      manager: p.manager,
      updatedAt: (p as any).updatedAt,
    },
    progress: {
      percentage: progressPct,
      completed: completedSchedules,
      total: totalSchedules,
    },
    schedules: p.schedules.slice(0, 5),
    photos: p.photos,
    defects: { open: openDefects, resolved: resolvedDefects, total: p.defects.length },
  })
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const share = await prisma.projectShareToken.findUnique({
    where: { token: params.token },
    include: { project: { select: { id: true, customerId: true, companyId: true } } },
  })

  if (!share) return NextResponse.json({ error: 'リンクが無効です' }, { status: 404 })
  if (share.expiresAt && share.expiresAt < new Date()) {
    return NextResponse.json({ error: 'リンクの有効期限が切れています' }, { status: 410 })
  }

  const { subject, message } = await req.json()
  if (!subject || !message) {
    return NextResponse.json({ error: '件名とメッセージは必須です' }, { status: 400 })
  }

  const p = share.project
  if (!p.customerId) {
    return NextResponse.json({ error: '顧客情報が設定されていません' }, { status: 400 })
  }

  const record = await prisma.afterServiceRecord.create({
    data: {
      customerId: p.customerId,
      projectId: p.id,
      reportedAt: new Date(),
      content: `【件名】${subject}\n\n${message}`,
      status: '未対応',
      companyId: p.companyId,
    },
  })

  return NextResponse.json({ success: true, id: record.id }, { status: 201 })
}
