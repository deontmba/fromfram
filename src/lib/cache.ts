const cache = new Map<string, { value: unknown; expiry: number }>()

export function setCache(key: string, value: unknown, ttlSeconds = 300) {
  const expiry = Date.now() + ttlSeconds * 1000
  cache.set(key, { value, expiry })
}

export function getCache(key: string) {
  const item = cache.get(key)
  if (!item) return null
  if (Date.now() > item.expiry) {
    cache.delete(key)
    return null
  }
  return item.value
}

export function deleteCache(key: string) {
  cache.delete(key)
}