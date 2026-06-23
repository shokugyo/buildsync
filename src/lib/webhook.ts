import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function dispatchWebhook(companyId: string, event: string, payload: object) {
  // Dispatch to new WebhookConfig model
  const configs = await prisma.webhookConfig.findMany({
    where: { companyId, enabled: true },
  })

  const matchingConfigs = configs.filter(c => {
    try {
      const events: string[] = JSON.parse(c.events)
      return events.includes(event)
    } catch {
      return false
    }
  })

  await Promise.allSettled(matchingConfigs.map(async (config) => {
    const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() })
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-BuildSync-Event': event,
    }
    if (config.secret) {
      const sig = crypto.createHmac('sha256', config.secret).update(body).digest('hex')
      headers['X-BuildSync-Signature'] = `sha256=${sig}`
    }

    let statusCode: number | null = null
    let responseBody: string | null = null
    let success = false

    try {
      const res = await fetch(config.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10000) })
      statusCode = res.status
      responseBody = await res.text().catch(() => null)
      success = res.ok
    } catch (err: unknown) {
      responseBody = err instanceof Error ? err.message : '送信失敗'
      success = false
    }

    await prisma.webhookLog.create({
      data: {
        configId: config.id,
        event,
        payload: body,
        statusCode,
        responseBody,
        success,
      },
    }).catch(() => { /* ignore log write errors */ })
  }))

  // Also dispatch to legacy Webhook model
  const webhooks = await prisma.webhook.findMany({
    where: { companyId, isActive: true },
  })

  const matchingWebhooks = webhooks.filter(w =>
    w.events.split(',').map(e => e.trim()).includes(event)
  )

  await Promise.allSettled(matchingWebhooks.map(async (webhook) => {
    const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() })
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-BuildSync-Event': event,
    }
    if (webhook.secret) {
      const sig = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex')
      headers['X-BuildSync-Signature'] = `sha256=${sig}`
    }
    try {
      await fetch(webhook.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10000) })
    } catch {
      // silently fail - webhook delivery is best-effort
    }
  }))
}
