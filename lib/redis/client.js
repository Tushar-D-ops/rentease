import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  prefix: 'rentease:api',
})

export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  prefix: 'rentease:auth',
})

export const qrRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(1, '30 s'),
  prefix: 'rentease:qr',
})

export async function cacheGet(key) {
  try {
    const val = await redis.get(key)
    return val ? JSON.parse(val) : null
  } catch { return null }
}

export async function cacheSet(key, value, exSeconds = 300) {
  try { await redis.set(key, JSON.stringify(value), { ex: exSeconds }) } catch {}
}

export async function cacheDel(key) {
  try { await redis.del(key) } catch {}
}

export async function cacheUserRole(userId, role) {
  await redis.set(`role:${userId}`, role, { ex: 3600 })
}

export async function getCachedUserRole(userId) {
  return redis.get(`role:${userId}`)
}