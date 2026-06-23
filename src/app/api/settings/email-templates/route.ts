import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  project_created: {
    subject: '【BuildSync】案件が登録されました：{{projectName}}',
    body: `<p>{{userName}} 様</p>
<p>新しい案件が登録されました。</p>
<ul>
  <li>案件名：{{projectName}}</li>
  <li>案件番号：{{projectNumber}}</li>
  <li>登録日：{{createdAt}}</li>
</ul>
<p><a href="{{projectUrl}}">案件詳細を確認する</a></p>`,
  },
  order_approval: {
    subject: '【BuildSync】発注承認依頼：{{orderNumber}}',
    body: `<p>{{userName}} 様</p>
<p>以下の発注について承認をお願いします。</p>
<ul>
  <li>発注番号：{{orderNumber}}</li>
  <li>件名：{{orderSubject}}</li>
  <li>金額：{{amount}}</li>
  <li>発注先：{{supplierName}}</li>
</ul>
<p><a href="{{orderUrl}}">発注を確認する</a></p>`,
  },
  order_confirmed: {
    subject: '【BuildSync】発注が承認されました：{{orderNumber}}',
    body: `<p>{{userName}} 様</p>
<p>発注が承認されました。</p>
<ul>
  <li>発注番号：{{orderNumber}}</li>
  <li>件名：{{orderSubject}}</li>
  <li>承認者：{{approverName}}</li>
</ul>
<p><a href="{{orderUrl}}">発注を確認する</a></p>`,
  },
  inspection_scheduled: {
    subject: '【BuildSync】検査予定のお知らせ：{{inspectionName}}',
    body: `<p>{{userName}} 様</p>
<p>検査の予定が登録されました。</p>
<ul>
  <li>検査名：{{inspectionName}}</li>
  <li>案件：{{projectName}}</li>
  <li>予定日：{{scheduledDate}}</li>
</ul>
<p><a href="{{inspectionUrl}}">検査詳細を確認する</a></p>`,
  },
  defect_registered: {
    subject: '【BuildSync】是正事項が登録されました',
    body: `<p>{{userName}} 様</p>
<p>新しい是正事項が登録されました。</p>
<ul>
  <li>案件：{{projectName}}</li>
  <li>内容：{{defectContent}}</li>
  <li>期限：{{dueDate}}</li>
</ul>
<p><a href="{{defectUrl}}">是正事項を確認する</a></p>`,
  },
  account_invited: {
    subject: '【BuildSync】アカウントへの招待',
    body: `<p>{{userName}} 様</p>
<p>BuildSyncへご招待します。</p>
<p>以下の情報でログインしてください。</p>
<ul>
  <li>ログインURL：{{loginUrl}}</li>
  <li>メールアドレス：{{email}}</li>
  <li>初期パスワード：{{password}}</li>
</ul>`,
  },
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId

  const saved = await prisma.emailTemplate.findMany({ where: { companyId } })
  const savedMap = Object.fromEntries(saved.map(t => [t.type, t]))

  const result = Object.entries(DEFAULT_TEMPLATES).map(([type, defaults]) => ({
    type,
    subject: savedMap[type]?.subject ?? defaults.subject,
    body: savedMap[type]?.body ?? defaults.body,
    isCustom: !!savedMap[type],
  }))

  return NextResponse.json(result)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId
  const { type, subject, body } = await req.json()

  if (!type || !subject || !body) {
    return NextResponse.json({ error: 'type, subject, body は必須です' }, { status: 400 })
  }
  if (!DEFAULT_TEMPLATES[type]) {
    return NextResponse.json({ error: '無効なテンプレートタイプです' }, { status: 400 })
  }

  const template = await prisma.emailTemplate.upsert({
    where: { companyId_type: { companyId, type } },
    create: { companyId, type, subject, body },
    update: { subject, body },
  })

  return NextResponse.json(template)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  const companyId = (session.user as any).companyId
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  if (!type) return NextResponse.json({ error: 'type is required' }, { status: 400 })

  await prisma.emailTemplate.deleteMany({ where: { companyId, type } })
  return NextResponse.json({ ok: true })
}
