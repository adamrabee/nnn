import type { VercelRequest, VercelResponse } from '@vercel/node'

/** Tells the browser whether the AI mode is really configured on the server. */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY)
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ ai: configured, model: configured ? process.env.ANTHROPIC_MODEL || 'claude-opus-5-5' : null })
}
