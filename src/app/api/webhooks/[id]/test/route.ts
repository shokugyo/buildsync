import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if ((session.user as any).role !== '管理者') return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

  const companyId = (session.user as any).companyId
  const { id } = params

  const config = await prisma.webhookConfig.findFirst({ where: { id, companyId } })
  if (!config) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const payload = {
    event: 'test',
    timestamp: new Date().toISOString(),
    data: { message: 'テスト送信' },
  }
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-BuildSync-Event': 'test',
  }
  if (config.secret) {
    const sig = crypto.createHmac('sha256', config.secret).update(body).digest('hex')
    headers['X-BuildSync-Signature'] = `sha256=${sig}`
  }

  let statusCode: number | null = null
  let responseBody: string | null = null
  let success = false

  try {
    const res = await fetch(config.url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    })
    statusCode = res.status
    responseBody = await res.text().catch(() => null)
    success = res.ok
  } catch (err: unknown) {
    responseBody = err instanceof Error ? err.message : 'リクエスト失敗'
    success = false
  }

  await prisma.webhookLog.create({
    data: {
      configId: config.id,
      event: 'test',
      payload: body,
      statusCode,
      responseBody,
      success,
    },
  })

  return NextResponse.json({ success, statusCode, responseBody })
}
