import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const userId = (session.user as any).id

  const formData = await req.formData()
  const file = formData.get('avatar') as File
  if (!file) return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filename = `avatar_${userId}.${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')

  // Ensure directory exists
  const { mkdir } = await import('fs/promises')
  await mkdir(uploadDir, { recursive: true })

  await writeFile(path.join(uploadDir, filename), buffer)
  const avatarPath = `/uploads/avatars/${filename}`

  await prisma.user.update({
    where: { id: userId },
    data: { avatarPath },
  })

  return NextResponse.json({ avatarPath })
}
