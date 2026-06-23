import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const members = await prisma.projectMember.findMany({
    where: { projectId: params.id },
    include: { user: { select: { id: true, name: true, email: true, role: true, jobType: true, phone: true, company: { select: { name: true } } } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(members)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { userId, labels } = body
  // Accept either 'role' or 'memberRole' parameter (role is the public API alias)
  const memberRole: string = body.role || body.memberRole || 'メンバー'
  if (!userId) return NextResponse.json({ error: 'ユーザーIDは必須です' }, { status: 400 })

  try {
    const project = await prisma.project.findUnique({ where: { id: params.id }, select: { name: true } })
    const member = await prisma.projectMember.create({
      data: { projectId: params.id, userId, memberRole: memberRole || '一般', labels: labels || null },
      include: { user: { select: { id: true, name: true, email: true, role: true, jobType: true, phone: true, company: { select: { name: true } } } } },
    })
    await prisma.notification.create({
      data: {
        userId,
        title: 'プロジェクトに追加されました',
        content: `「${project?.name}」のメンバーとして追加されました（役割：${memberRole || '一般'}）`,
        type: 'project_member',
        link: `/projects/${params.id}`,
      },
    })
    return NextResponse.json(member, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'すでに追加されているユーザーです' }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { memberId } = body
  // Accept either 'role' or 'memberRole' parameter
  const memberRole: string | undefined = body.role || body.memberRole
  if (!memberId) return NextResponse.json({ error: 'memberIdは必須です' }, { status: 400 })

  const updated = await prisma.projectMember.update({
    where: { id: memberId },
    data: { memberRole },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'ユーザーIDは必須です' }, { status: 400 })

  await prisma.projectMember.deleteMany({ where: { projectId: params.id, userId } })
  return NextResponse.json({ success: true })
}
