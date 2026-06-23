import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const record = await prisma.safetyEducation.findUnique({
    where: { id: params.id },
    include: {
      project: { select: { id: true, name: true, projectNumber: true } },
    },
  })

  if (!record) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  if (record.companyId !== (session.user as { companyId: string }).companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  return NextResponse.json(record)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { projectId, title, educatedAt, instructor, attendees, content } = body

  try {
    const record = await prisma.safetyEducation.update({
      where: { id: params.id },
      data: {
        ...(projectId !== undefined && { projectId: projectId || null }),
        ...(title !== undefined && { title }),
        ...(educatedAt !== undefined && { educatedAt: new Date(educatedAt) }),
        ...(instructor !== undefined && { instructor: instructor || null }),
        ...(attendees !== undefined && {
          attendees: typeof attendees === 'string' ? attendees : JSON.stringify(attendees),
        }),
        ...(content !== undefined && { content: content || null }),
      },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
      },
    })
    return NextResponse.json(record)
  } catch {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    await prisma.safetyEducation.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
