import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { name } = body

  if (!name) return NextResponse.json({ error: 'フォルダ名は必須です' }, { status: 400 })

  const folder = await prisma.documentFolder.update({
    where: { id: params.id },
    data: { name },
  })

  return NextResponse.json(folder)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  await prisma.documentFolder.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
