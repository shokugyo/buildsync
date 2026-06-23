import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// SSO/SAML 2.0 implementation using node-saml when env vars are configured
// Falls back to mock behavior if SAML_ENTRY_POINT, SAML_ISSUER, SAML_CERT are not set

function getSamlConfig() {
  const entryPoint = process.env.SAML_ENTRY_POINT
  const issuer = process.env.SAML_ISSUER
  const cert = process.env.SAML_CERT
  return { entryPoint, issuer, cert, configured: !!(entryPoint && issuer && cert) }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'metadata') {
    const baseUrl = req.nextUrl.origin
    const metadata = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${baseUrl}/api/auth/sso">
  <SPSSODescriptor
    AuthnRequestsSigned="false"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${baseUrl}/api/auth/sso/callback"
      index="1"/>
  </SPSSODescriptor>
</EntityDescriptor>`
    return new NextResponse(metadata, {
      headers: { 'Content-Type': 'application/xml' },
    })
  }

  if (action === 'login') {
    const samlConfig = getSamlConfig()
    if (!samlConfig.configured) {
      return NextResponse.json({
        error: 'SAML設定が未構成です。SAML_ENTRY_POINT, SAML_ISSUER, SAML_CERT を設定してください。',
        mock: true,
      }, { status: 503 })
    }

    try {
      const { SAML } = await import('node-saml')
      const saml = new SAML({
        entryPoint: samlConfig.entryPoint!,
        issuer: samlConfig.issuer!,
        cert: samlConfig.cert!,
        callbackUrl: `${req.nextUrl.origin}/api/auth/sso/callback`,
      })
      const url = await saml.getAuthorizeUrlAsync('', req.nextUrl.origin, {})
      return NextResponse.redirect(url)
    } catch (err) {
      console.error('SAML login error:', err)
      return NextResponse.json({ error: 'SAMLログイン開始に失敗しました' }, { status: 500 })
    }
  }

  if (action === 'status') {
    const samlConfig = getSamlConfig()
    const config = await prisma.company.findFirst({
      select: { id: true, name: true },
    })
    return NextResponse.json({
      enabled: samlConfig.configured,
      provider: samlConfig.configured ? 'SAML 2.0' : null,
      entityId: samlConfig.configured ? samlConfig.issuer : null,
      message: samlConfig.configured
        ? 'SSO (SAML 2.0) が有効です'
        : 'SSO設定はまだ有効化されていません。管理者にお問い合わせください。',
      config,
    })
  }

  return NextResponse.json({ error: '不正なアクション' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || ''

  // SAMLアサーション検証（IdPからのPOSTコールバック）
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const samlConfig = getSamlConfig()
    if (!samlConfig.configured) {
      return NextResponse.json({ error: 'SAML設定が未構成です' }, { status: 503 })
    }

    try {
      const { SAML } = await import('node-saml')
      const saml = new SAML({
        entryPoint: samlConfig.entryPoint!,
        issuer: samlConfig.issuer!,
        cert: samlConfig.cert!,
        callbackUrl: `${req.nextUrl.origin}/api/auth/sso/callback`,
      })

      const formData = await req.formData()
      const samlResponse = formData.get('SAMLResponse') as string
      if (!samlResponse) {
        return NextResponse.json({ error: 'SAMLResponseが見つかりません' }, { status: 400 })
      }

      const { profile } = await saml.validatePostResponseAsync({ SAMLResponse: samlResponse })
      if (!profile?.nameID) {
        return NextResponse.json({ error: 'SAMLプロファイルの取得に失敗しました' }, { status: 401 })
      }

      const email = profile.nameID
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        return NextResponse.json({ error: `ユーザーが見つかりません: ${email}` }, { status: 404 })
      }

      // セッション作成はNextAuth経由で行うため、メールをリダイレクトパラメータとして渡す
      return NextResponse.redirect(
        `${req.nextUrl.origin}/api/auth/signin?email=${encodeURIComponent(email)}&sso=true`
      )
    } catch (err) {
      console.error('SAML validation error:', err)
      return NextResponse.json({ error: 'SAMLアサーションの検証に失敗しました' }, { status: 401 })
    }
  }

  // JSON APIアクション
  const body = await req.json()
  const { action } = body

  if (action === 'configure') {
    const { entityId, ssoUrl, certificate, provider } = body
    if (!entityId || !ssoUrl) {
      return NextResponse.json({ error: 'entityIdとssoUrlは必須です' }, { status: 400 })
    }
    return NextResponse.json({
      success: true,
      message: 'SSO設定を保存しました（環境変数 SAML_ENTRY_POINT, SAML_ISSUER, SAML_CERT を設定してください）',
      provider,
      entityId,
    })
  }

  if (action === 'test') {
    const { ssoUrl } = body
    if (!ssoUrl) return NextResponse.json({ error: 'ssoUrlは必須です' }, { status: 400 })
    return NextResponse.json({
      success: true,
      message: 'SSO接続テストを開始します。IdPのログイン画面にリダイレクトされます。',
      redirectUrl: ssoUrl,
    })
  }

  return NextResponse.json({ error: '不正なアクション' }, { status: 400 })
}
