import { getSupabaseAdmin } from '../supabase/server.js'

export async function runDynamicPricingForProperty(propertyId) {
  const supabase = getSupabaseAdmin()
  const { data: property } = await supabase
    .from('properties').select('id,base_price,current_price,dynamic_pricing_enabled').eq('id',propertyId).single()
  if (!property?.dynamic_pricing_enabled) return null

  const { count: totalRooms } = await supabase.from('rooms').select('*',{count:'exact',head:true}).eq('property_id',propertyId)
  const { count: filledRooms } = await supabase.from('rooms').select('*',{count:'exact',head:true}).eq('property_id',propertyId).eq('status','filled')
  if (!totalRooms) return null

  const occupancyRate = (filledRooms / totalRooms) * 100
  let newPrice = property.current_price, reason = null

  if (occupancyRate > 80)      { newPrice = Math.floor(property.base_price * 1.05); reason = 'occupancy_high' }
  else if (occupancyRate < 40) { newPrice = Math.floor(property.base_price * 0.97); reason = 'occupancy_low'  }

  if (newPrice !== property.current_price && reason) {
    await supabase.from('properties').update({ current_price: newPrice }).eq('id', propertyId)
    await supabase.from('pricing_history').insert({ property_id: propertyId, old_price: property.current_price, new_price: newPrice, reason, occupancy_rate: occupancyRate })
    return { propertyId, oldPrice: property.current_price, newPrice, reason, occupancyRate }
  }
  return null
}

export async function runDynamicPricingAll() {
  const supabase = getSupabaseAdmin()
  const { data: properties } = await supabase.from('properties').select('id').eq('dynamic_pricing_enabled',true).eq('status','approved')
  if (!properties?.length) return []
  const results = await Promise.allSettled(properties.map((p) => runDynamicPricingForProperty(p.id)))
  return results.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value)
}