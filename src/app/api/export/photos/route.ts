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

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId') || undefined

  const photos = await prisma.photo.findMany({
    where: {
      project: { companyId },
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { name: true, projectNumber: true } },
      uploader: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const header = ['案件番号', '案件名', '撮影種別', '撮影箇所', 'コメント', 'タグ', '撮影者', '登録日時']
  const rows = photos.map(ph => [
    ph.project.projectNumber,
    ph.project.name,
    ph.shootingType ?? '',
    ph.location ?? '',
    ph.comment ?? '',
    ph.tags ?? '',
    ph.uploader.name,
    new Date(ph.createdAt).toLocaleString('ja-JP'),
  ])

  const csv = toCsv([header, ...rows])
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="photos_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
