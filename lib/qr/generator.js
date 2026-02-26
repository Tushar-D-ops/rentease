import QRCode from 'qrcode'
import crypto from 'crypto'

export function generateQRToken(studentId) {
  const random = crypto.randomBytes(16).toString('hex')
  return crypto.createHash('sha256').update(`${studentId}-${random}-${Date.now()}`).digest('hex')
}

export async function generateQRCodeDataURL(token, options = {}) {
  const qrData = JSON.stringify({ token, platform: 'rentease', version: 1 })
  return QRCode.toDataURL(qrData, {
    width: options.width || 300,
    margin: options.margin || 2,
    color: { dark: '#0d1117', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  })
}

export async function generateQRCodeSVG(token) {
  const qrData = JSON.stringify({ token, platform: 'rentease', version: 1 })
  return QRCode.toString(qrData, { type: 'svg', errorCorrectionLevel: 'H' })
}

export function parseQRPayload(raw) {
  try {
    const parsed = JSON.parse(raw)
    if (parsed.platform !== 'rentease') throw new Error('Invalid')
    return { valid: true, token: parsed.token }
  } catch { return { valid: false, token: null } }
}

export function isCurfewViolation(scanType, curfewStart = 22, curfewEnd = 6) {
  if (scanType !== 'out') return false
  const hour = new Date().getHours()
  return hour >= curfewStart || hour < curfewEnd
}