import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const { name, items } = await req.json()
  const template = await prisma.inspectionTemplate.update({
    where: { id: params.id },
    data: { name, items: JSON.stringify(items || []) },
  })
  return NextResponse.json({ ...template, items: JSON.parse(template.items) })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  await prisma.inspectionTemplate.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
