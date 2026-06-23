import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const memberships = await prisma.projectMember.findMany({
    where: { userId: params.id },
    include: { project: { select: { id: true, name: true, projectNumber: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(memberships)
}
