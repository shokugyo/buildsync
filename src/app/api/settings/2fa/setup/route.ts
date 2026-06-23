import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateSecret, otpauthURL } from '@/lib/totp'
import QRCode from 'qrcode'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = session.user?.email ?? ''
  const secret = generateSecret()
  const url = otpauthURL(secret, email)
  const qrDataUrl = await QRCode.toDataURL(url)

  return NextResponse.json({ secret, otpauthUrl: url, qrDataUrl })
}
