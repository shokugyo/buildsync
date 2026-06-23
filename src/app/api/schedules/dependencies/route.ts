import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const deps = await prisma.scheduleDependency.findMany({
    where: { schedule: { project: { companyId: (session.user as { companyId?: string }).companyId } } },
    include: {
      predecessor: { select: { id: true, name: true, startDate: true, endDate: true, status: true } },
    },
  })
  return NextResponse.json(deps)
}
