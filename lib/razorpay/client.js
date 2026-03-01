// import Razorpay from 'razorpay'
// import crypto from 'crypto'

// export const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// })

// export async function createRazorpayOrder({ amount, invoiceId, studentId, notes = {} }) {
//   return razorpay.orders.create({
//     amount,
//     currency: 'INR',
//     receipt: invoiceId,
//     notes: { invoice_id: invoiceId, student_id: studentId, ...notes },
//   })
// }

// export function verifyRazorpayWebhook(body, signature) {
//   const expected = crypto
//     .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
//     .update(body)
//     .digest('hex')
//   return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
// }

// export function verifyPaymentSignature({ orderId, paymentId, signature }) {
//   const payload = `${orderId}|${paymentId}`
//   const expected = crypto
//     .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//     .update(payload)
//     .digest('hex')
//   return expected === signature
// }

// export function formatAmount(paise) {
//   return `₹${(paise / 100).toLocaleString('en-IN')}`
// }

// export const PLATFORM_COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_PERCENT || '1') / 100
// export function calculateCommission(amount) {
//   return Math.floor(amount * PLATFORM_COMMISSION_RATE)
// }