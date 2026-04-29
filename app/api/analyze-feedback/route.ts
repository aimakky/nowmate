import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  const { adminKey, messages } = await req.json()

  if (adminKey !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!messages?.length) {
    return NextResponse.json({ error: 'No feedback to analyze' }, { status: 400 })
  }

  const feedbackText = (messages as string[]).map((m, i) => `${i + 1}. "${m}"`).join('\n')

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: 'You are a product manager analyzing user feedback for "休憩村" — a Japan survival kit app for foreign residents in Japan. Return only valid JSON, no markdown.',
    messages: [{
      role: 'user',
      content: `Analyze these ${messages.length} user feedback messages and return a JSON object with this exact structure:
{
  "summary": "One sentence overview of the main themes",
  "top3": [
    {
      "title": "Short feature name",
      "votes": <estimated number of people who want this>,
      "impact": "high|medium|low",
      "effort": "small|medium|large",
      "description": "What to build in 1-2 sentences",
      "why": "Why this matters for expats in Japan"
    }
  ],
  "quick_wins": ["One small thing to fix right now"],
  "insight": "One surprising or non-obvious insight"
}

Feedback:
${feedbackText}`,
    }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
  try {
    return NextResponse.json({ analysis: JSON.parse(raw) })
  } catch {
    return NextResponse.json({ analysis: raw })
  }
}
