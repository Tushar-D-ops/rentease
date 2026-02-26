import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@rentease.in'

async function sendEmail({ to, subject, html }) {
  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html })
    if (error) console.error('[Email Error]', error)
    return { success: !error, data }
  } catch (err) { console.error('[Email Send Failed]', err); return { success: false } }
}

function baseLayout(content, headerColor = 'linear-gradient(135deg,#4f6ef7,#7c3aed)', headerContent = '') {
  return `<!DOCTYPE html><html><body style="margin:0;background:#0d1117;font-family:'Segoe UI',sans-serif">
<div style="max-width:600px;margin:40px auto;background:#161b22;border-radius:16px;overflow:hidden;border:1px solid #30363d">
  <div style="background:${headerColor};padding:32px 40px">${headerContent}</div>
  <div style="padding:40px">${content}</div>
  <div style="padding:20px 40px;border-top:1px solid #21262d;text-align:center"><p style="color:#484f58;font-size:12px;margin:0">RentEase Technologies Pvt. Ltd. · Made with ❤️ in India</p></div>
</div></body></html>`
}

export async function sendWelcomeEmail(user) {
  const isOwner = user.role === 'owner'
  return sendEmail({
    to: user.email, subject: '🏠 Welcome to RentEase!',
    html: baseLayout(
      `<p style="color:#c9d1d9">Hi ${user.full_name},</p>
       <p style="color:#8b949e;line-height:1.7">${isOwner ? 'Your owner account is ready. List your first property!' : 'Your student account is ready. Find your perfect PG!'}</p>
       <a href="${process.env.NEXT_PUBLIC_APP_URL}/${isOwner?'owner':'student'}" style="display:block;text-align:center;background:linear-gradient(135deg,#4f6ef7,#7c3aed);color:#fff;text-decoration:none;padding:14px;border-radius:10px;font-weight:700;margin-top:24px">Go to Dashboard →</a>`,
      'linear-gradient(135deg,#4f6ef7,#7c3aed)',
      `<div style="font-size:24px;font-weight:800;color:#fff">🏠 RentEase</div><div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px">Welcome aboard!</div>`
    )
  })
}

export async function sendInvoiceEmail(user, invoice, property) {
  const total = (invoice.total_amount/100).toLocaleString('en-IN')
  return sendEmail({
    to: user.email, subject: `📋 Invoice – ${invoice.billing_month_label}`,
    html: baseLayout(
      `<p style="color:#c9d1d9">Hi ${user.full_name}, your invoice for ${invoice.billing_month_label} is ready.</p>
       <div style="background:#0d1117;border-radius:12px;padding:24px;border:1px solid #30363d;margin:20px 0">
         <div style="display:flex;justify-content:space-between;padding:8px 0;color:#c9d1d9;font-size:14px"><span>Base Rent</span><span>₹${(invoice.base_rent/100).toLocaleString('en-IN')}</span></div>
         ${invoice.electricity_amount>0?`<div style="display:flex;justify-content:space-between;padding:8px 0;color:#c9d1d9;font-size:14px"><span>⚡ Electricity</span><span>₹${(invoice.electricity_amount/100).toLocaleString('en-IN')}</span></div>`:''}
         ${invoice.late_fee>0?`<div style="display:flex;justify-content:space-between;padding:8px 0;color:#ff4d6d;font-size:14px"><span>⚠️ Late Fee</span><span>₹${(invoice.late_fee/100).toLocaleString('en-IN')}</span></div>`:''}
         <div style="border-top:1px solid #30363d;margin-top:12px;padding-top:12px;display:flex;justify-content:space-between"><span style="color:#fff;font-weight:700">Total</span><span style="color:#4f6ef7;font-weight:700;font-size:20px">₹${total}</span></div>
       </div>
       <div style="background:rgba(245,166,35,0.1);border:1px solid rgba(245,166,35,0.3);border-radius:10px;padding:14px;margin-bottom:24px;color:#f5a623;font-size:14px">📅 Due: ${invoice.due_date_label}</div>
       <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/payments" style="display:block;text-align:center;background:linear-gradient(135deg,#4f6ef7,#7c3aed);color:#fff;text-decoration:none;padding:14px;border-radius:10px;font-weight:700">Pay Now →</a>`,
      'linear-gradient(135deg,#4f6ef7,#7c3aed)',
      `<div style="font-size:24px;font-weight:800;color:#fff">🏠 RentEase</div><div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px">Monthly Invoice</div>`
    )
  })
}

export async function sendPaymentSuccessEmail(user, invoice, payment) {
  return sendEmail({
    to: user.email, subject: '✅ Payment Confirmed – RentEase',
    html: baseLayout(
      `<p style="color:#c9d1d9">Hi ${user.full_name}, your payment of ₹${(invoice.total_amount/100).toLocaleString('en-IN')} for ${invoice.billing_month_label||invoice.billing_month} is confirmed!</p>
       <div style="background:#0d1117;border-radius:12px;padding:20px;border:1px solid #30363d;margin:20px 0;color:#c9d1d9;font-size:14px;line-height:2">
         <div>Payment ID: <span style="color:#4f6ef7">${payment?.razorpay_payment_id||'N/A'}</span></div>
         <div>Status: <span style="color:#06d6a0;font-weight:700">Captured ✓</span></div>
       </div>
       <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/payments" style="display:block;text-align:center;background:#06d6a0;color:#0d1117;text-decoration:none;padding:14px;border-radius:10px;font-weight:700">View Receipt →</a>`,
      'linear-gradient(135deg,#06d6a0,#059669)',
      `<div style="text-align:center"><div style="font-size:48px">✅</div><div style="color:#fff;font-size:20px;font-weight:700;margin-top:12px">Payment Successful!</div></div>`
    )
  })
}

export async function sendPaymentFailedEmail(user, invoice) {
  return sendEmail({
    to: user.email, subject: '❌ Payment Failed – Action Required',
    html: baseLayout(
      `<p style="color:#c9d1d9">Hi ${user.full_name}, your payment failed. Please retry to avoid late fees.</p>
       <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/payments" style="display:block;text-align:center;background:#ff4d6d;color:#fff;text-decoration:none;padding:14px;border-radius:10px;font-weight:700;margin-top:24px">Retry Payment →</a>`,
      'linear-gradient(135deg,#ff4d6d,#c9184a)',
      `<div style="text-align:center"><div style="font-size:48px">❌</div><div style="color:#fff;font-size:20px;font-weight:700;margin-top:12px">Payment Failed</div></div>`
    )
  })
}

export async function sendPaymentReminderEmail(user, invoice) {
  return sendEmail({
    to: user.email, subject: '🔔 Rent Due Reminder – RentEase',
    html: baseLayout(
      `<p style="color:#c9d1d9">Hi ${user.full_name}, your rent of ₹${(invoice.total_amount/100).toLocaleString('en-IN')} for ${invoice.billing_month_label} is due on ${invoice.due_date_label}.</p>
       <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/payments" style="display:block;text-align:center;background:#f5a623;color:#0d1117;text-decoration:none;padding:14px;border-radius:10px;font-weight:700;margin-top:24px">Pay Now →</a>`,
      'linear-gradient(135deg,#f5a623,#e09110)',
      `<div style="text-align:center"><div style="font-size:48px">🔔</div><div style="color:#fff;font-size:20px;font-weight:700;margin-top:12px">Payment Reminder</div></div>`
    )
  })
}

export async function sendLateFeeEmail(user, invoice) {
  return sendEmail({
    to: user.email, subject: '⚠️ Late Fee Applied – RentEase',
    html: baseLayout(
      `<p style="color:#c9d1d9">Hi ${user.full_name}, a 2% late fee has been added. Your new total is ₹${(invoice.total_amount/100).toLocaleString('en-IN')}.</p>
       <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/payments" style="display:block;text-align:center;background:#ff4d6d;color:#fff;text-decoration:none;padding:14px;border-radius:10px;font-weight:700;margin-top:24px">Pay Now →</a>`,
      'linear-gradient(135deg,#ff4d6d,#c9184a)',
      `<div style="text-align:center"><div style="font-size:48px">⚠️</div><div style="color:#fff;font-size:20px;font-weight:700;margin-top:12px">Late Fee Applied</div></div>`
    )
  })
}

export async function sendQRAlertEmail(user, log) {
  const time = new Date(log.scanned_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})
  return sendEmail({
    to: user.email, subject: log.is_curfew_violation ? '🚨 Curfew Violation Alert' : `📱 Check-${log.scan_type==='in'?'In':'Out'} Logged`,
    html: baseLayout(
      `<div style="background:#0d1117;border-radius:12px;padding:20px;border:1px solid #30363d;color:#c9d1d9;font-size:14px;line-height:2">
         <div>Student: <span style="color:#fff">${user.full_name}</span></div>
         <div>Action: <span style="color:${log.scan_type==='in'?'#06d6a0':'#ff4d6d'};font-weight:600">Check ${log.scan_type.toUpperCase()}</span></div>
         <div>Time: <span style="color:#fff">${time}</span></div>
         ${log.is_curfew_violation?'<div style="color:#ff4d6d;font-weight:600">⚠️ Curfew violation detected!</div>':''}
       </div>`,
      log.is_curfew_violation?'linear-gradient(135deg,#ff4d6d,#c9184a)':'linear-gradient(135deg,#4f6ef7,#7c3aed)',
      `<div style="text-align:center"><div style="font-size:48px">${log.is_curfew_violation?'🚨':log.scan_type==='in'?'🟢':'🔴'}</div><div style="color:#fff;font-size:18px;font-weight:700;margin-top:12px">${log.is_curfew_violation?'Curfew Violation!':('Check-'+(log.scan_type==='in'?'In':'Out')+' Logged')}</div></div>`
    )
  })
}

export async function sendDisputeEmail(user, dispute, toOwner = false) {
  return sendEmail({
    to: user.email, subject: `⚖️ Dispute ${toOwner?'Received':'Update'} – RentEase`,
    html: baseLayout(
      `<p style="color:#c9d1d9">Hi ${user.full_name},</p>
       <div style="background:#0d1117;border-radius:12px;padding:20px;border:1px solid #30363d;margin:20px 0">
         <div style="color:#f5a623;font-weight:600;margin-bottom:8px">${dispute.title}</div>
         <div style="color:#8b949e;font-size:14px;line-height:1.6">${dispute.description}</div>
         <div style="margin-top:12px;color:#8b949e;font-size:12px">Status: <span style="color:#f5a623;font-weight:600;text-transform:uppercase">${dispute.status}</span></div>
       </div>
       <a href="${process.env.NEXT_PUBLIC_APP_URL}/${toOwner?'owner':'student'}/disputes" style="display:block;text-align:center;background:#f5a623;color:#0d1117;text-decoration:none;padding:14px;border-radius:10px;font-weight:700">View Dispute →</a>`,
      'linear-gradient(135deg,#f5a623,#e09110)',
      `<div style="font-size:24px;font-weight:800;color:#fff">⚖️ RentEase</div><div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px">Dispute ${toOwner?'Filed':'Update'}</div>`
    )
  })
}