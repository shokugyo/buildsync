import crypto from 'crypto'

export function computeHash(data: object): string {
  const json = JSON.stringify(data, Object.keys(data).sort())
  return crypto.createHash('sha256').update(json, 'utf8').digest('hex')
}
