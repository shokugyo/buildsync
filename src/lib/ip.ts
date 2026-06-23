export function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
}

export function isIpInCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) {
    return ip === cidr
  }
  const [range, bits] = cidr.split('/')
  const mask = bits === '0' ? 0 : (~0 << (32 - parseInt(bits, 10))) >>> 0
  try {
    return (ipToNumber(ip) & mask) === (ipToNumber(range) & mask)
  } catch {
    return false
  }
}

export function isIpAllowed(ip: string, cidrs: string[]): boolean {
  if (cidrs.length === 0) return true
  return cidrs.some((cidr) => isIpInCidr(ip, cidr))
}
