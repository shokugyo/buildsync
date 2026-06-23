import crypto from 'crypto'

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buffer: Buffer): string {
  let result = ''
  let bits = 0
  let value = 0
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]
    bits += 8
    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 31]
  }
  return result
}

function base32Decode(input: string): Buffer {
  const str = input.toUpperCase().replace(/=+$/, '')
  let bits = 0
  let value = 0
  const output: number[] = []
  for (let i = 0; i < str.length; i++) {
    const idx = BASE32_CHARS.indexOf(str[i])
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(output)
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret)
  const buf = Buffer.alloc(8)
  let tmp = counter
  for (let i = 7; i >= 0; i--) {
    buf[i] = tmp & 0xff
    tmp = Math.floor(tmp / 256)
  }
  const hmac = crypto.createHmac('sha1', key)
  hmac.update(buf)
  const digest = hmac.digest()
  const offset = digest[19] & 0xf
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  return String(code % 1000000).padStart(6, '0')
}

export function generateTOTP(secret: string, window = 0): string {
  const counter = Math.floor(Date.now() / 1000 / 30) + window
  return hotp(secret, counter)
}

export function verifyTOTP(secret: string, token: string): boolean {
  for (let w = -1; w <= 1; w++) {
    if (hotp(secret, Math.floor(Date.now() / 1000 / 30) + w) === token) {
      return true
    }
  }
  return false
}

export function generateSecret(): string {
  const bytes = crypto.randomBytes(20)
  return base32Encode(bytes)
}

export function generateBackupCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }
  return codes
}

export function otpauthURL(secret: string, email: string, issuer = 'BuildSync'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}
