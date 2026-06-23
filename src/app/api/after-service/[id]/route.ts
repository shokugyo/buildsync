import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { content, response, respondedAt, status } = body

  const record = await prisma.afterServiceRecord.update({
    where: { id: params.id },
    data: {
      ...(content !== undefined && { content }),
      ...(response !== undefined && { response: response || null }),
      ...(respondedAt !== undefined && { respondedAt: respondedAt ? new Date(respondedAt) : null }),
      ...(status !== undefined && { status }),
    },
    include: {
      customer: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  return NextResponse.json(record)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  await prisma.afterServiceRecord.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
