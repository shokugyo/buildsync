import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function toCsv(rows: string[][]): string {
  return rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const logs = await prisma.auditLog.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  })

  // userEmail が未設定のレコードは User テーブルから補完するため userId を収集
  const missingEmailIds = logs
    .filter(l => !l.userEmail)
    .map(l => l.userId)
  const uniqueIds = Array.from(new Set(missingEmailIds))

  const userEmailMap: Record<string, string> = {}
  if (uniqueIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, email: true },
    })
    for (const u of users) {
      userEmailMap[u.id] = u.email
    }
  }

  // RP-015 設計書指定列:
  // 操作日時, 操作者氏名, 操作者メールアドレス, 操作種別, 対象種別, 対象ID, 対象名称, IPアドレス
  const header = [
    '操作日時',
    '操作者氏名',
    '操作者メール',
    '操作種別',
    '対象種別',
    '対象ID',
    '対象名称',
    'IPアドレス',
  ]

  const rows = logs.map(l => [
    new Date(l.createdAt).toLocaleString('ja-JP'),
    l.userName,
    l.userEmail ?? userEmailMap[l.userId] ?? '',
    l.action,
    l.target,
    l.targetId ?? '',
    l.targetName ?? '',
    l.ipAddress ?? '',
  ])

  const bom = '\uFEFF'
  const csv = bom + toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
