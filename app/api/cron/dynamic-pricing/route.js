import { NextResponse } from 'next/server'
import { runDynamicPricingAll } from '@/lib/pricing/dynamicPricing'

export async function GET(req) {
  const cronSecret = req.headers.get('authorization')
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const results = await runDynamicPricingAll()
    return NextResponse.json({ success: true, updated: results.length, results })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}