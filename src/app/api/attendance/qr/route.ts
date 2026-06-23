import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import QRCode from 'qrcode'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 })

  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const checkInUrl = `${appUrl}/attendance/checkin?projectId=${projectId}`

  const qrDataUrl = await QRCode.toDataURL(checkInUrl, { width: 300, margin: 2 })

  return NextResponse.json({ qrDataUrl, checkInUrl })
}
