import { NextResponse } from 'next/server'

// GET: VAPID公開鍵を返す
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || 'DEMO_KEY'
  const configured = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL)
  return NextResponse.json({ publicKey, configured })
}
