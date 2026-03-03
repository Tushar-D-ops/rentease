// import { NextResponse } from 'next/server'
// import { auth } from '@clerk/nextjs/server'
// import { getSupabaseAdmin } from '@/lib/supabase/server'

// export async function POST(req) {
//   const { userId } = await auth()
//   if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

//   const supabase = getSupabaseAdmin()

//   // Verify owner
//   const { data: owner } = await supabase
//     .from('users').select('id, role').eq('clerk_id', userId).maybeSingle()
//   if (!owner || owner.role !== 'owner')
//     return NextResponse.json({ error: 'Owner access required' }, { status: 403 })

//   const { property_id, room_id, billing_month, prev_reading, curr_reading, rate_per_unit } = await req.json()

//   // Verify owner owns this property
//   const { data: property } = await supabase
//     .from('properties').select('id, owner_id').eq('id', property_id).maybeSingle()
//   if (!property || property.owner_id !== owner.id)
//     return NextResponse.json({ error: 'Property not found' }, { status: 404 })

//   const units_consumed = curr_reading - prev_reading
//   const total_amount   = units_consumed * rate_per_unit  // stored in paise

//   // Save electricity bill
//   const { data: bill, error: billError } = await supabase
//     .from('electricity_bills')
//     .insert({
//       property_id,
//       room_id:        room_id || null,
//       billing_month,
//       prev_reading,
//       curr_reading,
//       units_consumed,
//       rate_per_unit,
//       total_amount,
//     })
//     .select()
//     .single()

//   if (billError) return NextResponse.json({ error: billError.message }, { status: 500 })

//   // ✅ Now find all active enrollments for this property (and room if specified)
//   // and update their invoices for this billing month
//   let enrollmentQuery = supabase
//     .from('enrollments')
//     .select('id, student_id, monthly_rent')
//     .eq('property_id', property_id)
//     .eq('status', 'active')

//   if (room_id) enrollmentQuery = enrollmentQuery.eq('room_id', room_id)

//   const { data: enrollments } = await enrollmentQuery

//   let invoices_updated = 0

//   if (enrollments?.length) {
//     for (const enrollment of enrollments) {
//       // Find this student's invoice for this billing month
//       const { data: invoice } = await supabase
//         .from('invoices')
//         .select('id, base_rent, electricity_amount, late_fee, discount')
//         .eq('enrollment_id', enrollment.id)
//         .eq('billing_month', billing_month)
//         .maybeSingle()

//       if (invoice) {
//         // Invoice exists — update electricity amount and recalculate total
//         const new_total = invoice.base_rent + total_amount + (invoice.late_fee || 0) - (invoice.discount || 0)
//         await supabase
//           .from('invoices')
//           .update({
//             electricity_amount: total_amount,
//             total_amount:       new_total,
//             razorpay_order_id:  null, // reset so new order gets created at payment time
//           })
//           .eq('id', invoice.id)
//         invoices_updated++
//       }
//       // If no invoice exists yet, the next billing cycle will pick up
//       // the electricity_bills entry and include it automatically
//     }
//   }

//   return NextResponse.json({
//     success: true,
//     bill,
//     invoices_updated,
//     units_consumed,
//     total_amount,
//   })
// }




import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  const { data: owner } = await supabase
    .from('users').select('id, role').eq('clerk_id', userId).maybeSingle()
  if (!owner || owner.role !== 'owner')
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 })

  const { property_id, room_id, billing_month, prev_reading, curr_reading, rate_per_unit } = await req.json()

  if (!property_id || !billing_month || prev_reading == null || curr_reading == null)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  if (parseInt(curr_reading) <= parseInt(prev_reading))
    return NextResponse.json({ error: 'Current reading must be greater than previous reading' }, { status: 400 })

  // Verify owner owns this property
  const { data: property } = await supabase
    .from('properties').select('id, owner_id').eq('id', property_id).maybeSingle()
  if (!property || property.owner_id !== owner.id)
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  const units_consumed = parseInt(curr_reading) - parseInt(prev_reading)
  const total_amount   = units_consumed * parseInt(rate_per_unit || 800) // in paise

  // Save electricity bill (upsert in case owner corrects a reading)
  const { data: bill, error: billError } = await supabase
    .from('electricity_bills')
    .insert({
      property_id,
      room_id:       room_id || null,
      billing_month,
      prev_reading:  parseInt(prev_reading),
      curr_reading:  parseInt(curr_reading),
      units_consumed,
      rate_per_unit: parseInt(rate_per_unit || 800),
      total_amount,
    })
    .select()
    .single()

  if (billError) {
    console.error('[Electricity POST]', billError)
    return NextResponse.json({ error: billError.message }, { status: 500 })
  }

  // Find active enrollments for this property/room and update their invoices
  let enrollmentQuery = supabase
    .from('enrollments')
    .select('id, student_id, monthly_rent')
    .eq('property_id', property_id)
    .eq('status', 'active')

  if (room_id) enrollmentQuery = enrollmentQuery.eq('room_id', room_id)

  const { data: enrollments } = await enrollmentQuery

  let invoices_updated = 0

  if (enrollments?.length) {
    for (const enrollment of enrollments) {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('id, base_rent, late_fee, discount')
        .eq('enrollment_id', enrollment.id)
        .eq('billing_month', billing_month)
        .maybeSingle()

      if (invoice) {
        // Recalculate total with new electricity amount
        const new_total = invoice.base_rent + total_amount + (invoice.late_fee || 0) - (invoice.discount || 0)
        await supabase
          .from('invoices')
          .update({
            electricity_amount: total_amount,
            total_amount:       new_total,
            // ✅ razorpay_order_id NOT reset — UPI flow has no order to reset
          })
          .eq('id', invoice.id)
        invoices_updated++
      }
      // If no invoice yet for this month, billing cron will pick up electricity
      // automatically when it runs on the 1st
    }
  }

  return NextResponse.json({
    success: true,
    bill,
    invoices_updated,
    units_consumed,
    total_amount,
    message: invoices_updated > 0
      ? `Bill saved and ${invoices_updated} student invoice(s) updated`
      : 'Bill saved. Invoices will include this when generated on the 1st.',
  })
}
