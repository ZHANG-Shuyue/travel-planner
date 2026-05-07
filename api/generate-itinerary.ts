import type { VercelRequest, VercelResponse } from '@vercel/node'

type RateRecord = { count: number; resetAt: number }

const RATE_LIMIT_PER_HOUR = 10
const WINDOW_MS = 60 * 60 * 1000
const ipCounter = new Map<string, RateRecord>()

function getClientIp(req: VercelRequest) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim()
  if (Array.isArray(forwarded) && forwarded.length) return forwarded[0]
  return req.socket.remoteAddress ?? 'unknown'
}

function hitRateLimit(ip: string) {
  const now = Date.now()
  const current = ipCounter.get(ip)
  if (!current || now > current.resetAt) {
    ipCounter.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  if (current.count >= RATE_LIMIT_PER_HOUR) return true
  current.count += 1
  ipCounter.set(ip, current)
  return false
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, userApiKey } = req.body as { messages?: unknown; userApiKey?: string }

  const usePublicQuota = !userApiKey
  const apiKey = userApiKey || process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'No API key available' })
  }

  if (usePublicQuota) {
    const ip = getClientIp(req)
    if (hitRateLimit(ip)) {
      return res.status(429).json({ error: '公共额度用量较大，请稍后再试或填入自己的 API Key' })
    }
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || 'API 调用失败' })
    }
    return res.status(200).json(data)
  } catch {
    return res.status(500).json({ error: '服务暂时不可用，请稍后再试' })
  }
}
