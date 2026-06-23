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

  const header = ['日時', 'ユーザー名', '操作', '対象', '対象ID', '詳細']
  const rows = logs.map(l => [
    new Date(l.createdAt).toLocaleString('ja-JP'),
    l.userName,
    l.action,
    l.target,
    l.targetId ?? '',
    l.detail ?? '',
  ])

  const csv = toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit_${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
