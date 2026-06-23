import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const userId = (session.user as any).id
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      department: true,
      avatarPath: true,
      showAvatar: true,
      jobType: true,
    },
  })

  if (!user) return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
  return NextResponse.json(user)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const userId = (session.user as any).id
  const body = await req.json().catch(() => ({}))
  const { name, phone, department, avatarPath, currentPassword, newPassword } = body

  const updateData: Record<string, any> = {}
  if (name !== undefined) updateData.name = name
  if (phone !== undefined) updateData.phone = phone
  if (department !== undefined) updateData.department = department
  if (avatarPath !== undefined) updateData.avatarPath = avatarPath

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: '現在のパスワードを入力してください' }, { status: 400 })
    }
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.password) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return NextResponse.json({ error: '現在のパスワードが正しくありません' }, { status: 400 })
    }
    updateData.password = await bcrypt.hash(newPassword, 10)
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: '更新するフィールドがありません' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      department: true,
      avatarPath: true,
      showAvatar: true,
    },
  })

  return NextResponse.json(updated)
}
