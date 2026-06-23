import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const photos = await prisma.photo.findMany({
    where: { project: { companyId: session.user.companyId } },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  })

  const categories = photos.map((p) => p.category).filter(Boolean)
  return NextResponse.json(categories)
}
