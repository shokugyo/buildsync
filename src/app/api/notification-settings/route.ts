import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const NOTIFICATION_TYPES = [
  { type: 'project_created', label: '案件登録通知' },
  { type: 'project_status', label: '案件ステータス変更通知' },
  { type: 'schedule_change', label: '工程変更通知' },
  { type: 'chat_message', label: 'チャットメッセージ通知' },
  { type: 'chat_mention', label: 'メンション通知' },
  { type: 'drawing_update', label: '図面更新通知' },
  { type: 'photo_added', label: '写真追加通知' },
  { type: 'inspection_scheduled', label: '検査予定通知' },
  { type: 'defect_registered', label: '指摘登録通知' },
  { type: 'defect_resolved', label: '是正完了通知' },
  { type: 'order_approval', label: '発注承認依頼通知' },
  { type: 'order_confirmed', label: '発注済通知' },
  { type: 'invoice_approval', label: '請求承認依頼通知' },
  { type: 'payment_due', label: '支払期限通知' },
  { type: 'cost_overrun', label: '原価超過通知' },
  { type: 'account_invited', label: 'アカウント招待通知' },
]

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const userId = (session.user as any).id

  const [settings, user] = await Promise.all([
    prisma.notificationSetting.findMany({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { notifyEmail: true } }),
  ])

  const settingsMap = Object.fromEntries(settings.map((s) => [s.type, s.enabled]))

  const result = NOTIFICATION_TYPES.map((t) => ({
    type: t.type,
    label: t.label,
    enabled: settingsMap[t.type] !== undefined ? settingsMap[t.type] : true,
    emailEnabled: settingsMap[`${t.type}:email`] !== undefined ? settingsMap[`${t.type}:email`] : true,
  }))

  return NextResponse.json({
    settings: result,
    hasEmail: !!(user?.notifyEmail),
  })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const userId = (session.user as any).id
  const body = await req.json()
  const { type, enabled } = body

  if (!type || enabled === undefined) {
    return NextResponse.json({ error: 'typeとenabledは必須です' }, { status: 400 })
  }

  await prisma.notificationSetting.upsert({
    where: { userId_type: { userId, type } },
    create: { userId, type, enabled },
    update: { enabled },
  })

  return NextResponse.json({ type, enabled })
}
