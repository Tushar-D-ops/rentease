const WEIGHTS = { distance: 0.40, price: 0.35, rating: 0.25 }

export function scoreProperty(property, prefs = {}) {
  const maxDist  = prefs.maxDistance || 10
  const maxPrice = prefs.maxBudget   || 2000000
  const distanceScore = Math.max(0, 1 - (property.distance_km || 5) / maxDist)
  const priceScore    = Math.max(0, 1 - (property.current_price || maxPrice) / maxPrice)
  const ratingScore   = ((property.avg_rating || 3) / 5)
  let amenityBonus = 0
  if (prefs.amenities?.length && property.amenities?.length) {
    const matched = prefs.amenities.filter((a) => property.amenities.includes(a)).length
    amenityBonus = (matched / prefs.amenities.length) * 0.1
  }
  return Math.min(1, distanceScore*WEIGHTS.distance + priceScore*WEIGHTS.price + ratingScore*WEIGHTS.rating + amenityBonus)
}

export function rankProperties(properties, prefs = {}) {
  return properties
    .filter((p) => {
      if (prefs.maxBudget && p.current_price > prefs.maxBudget) return false
      if (prefs.maxDistance && p.distance_km > prefs.maxDistance) return false
      if (prefs.gender && p.gender_restriction !== 'any' && p.gender_restriction !== prefs.gender) return false
      return true
    })
    .map((p) => ({ ...p, score: scoreProperty(p, prefs) }))
    .sort((a, b) => b.score - a.score)
}

export function getCategoryWinners(properties) {
  if (!properties.length) return {}
  return {
    closest:   [...properties].sort((a,b) => (a.distance_km||99) - (b.distance_km||99))[0],
    cheapest:  [...properties].sort((a,b) => a.current_price - b.current_price)[0],
    bestRated: [...properties].sort((a,b) => (b.avg_rating||0) - (a.avg_rating||0))[0],
    bestValue: [...properties].sort((a,b) => b.score - a.score)[0],
  }
}

export function scoreLabel(score) {
  if (score >= 0.8) return { label: 'Excellent Match', color: '#06d6a0' }
  if (score >= 0.6) return { label: 'Good Match',      color: '#4f6ef7' }
  if (score >= 0.4) return { label: 'Fair Match',      color: '#f5a623' }
  return { label: 'Possible', color: '#8b949e' }
}