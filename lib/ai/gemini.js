import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM_PROMPT = `You are RentBot, an AI assistant for RentEase — a smart student accommodation platform in India.
You help students with: finding the best PG based on budget and distance, comparing properties, explaining rent/electricity bills, navigating the dashboard, understanding payment schedules, referral programs, and raising disputes.
Guidelines: Be friendly and concise. Use Indian context (₹, Indian cities). Keep responses under 200 words unless detail is needed. Use emojis occasionally.`

export async function chatWithGemini(messages, userContext = {}) {
  const contextStr = userContext.enrollment
    ? `\nUser context: Student at ${userContext.enrollment.property_name}, paying ₹${(userContext.enrollment.monthly_rent / 100).toLocaleString('en-IN')}/month`
    : ''

  const formatted = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }))

  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant', // free, fast, reliable
    messages: [
      { role: 'system', content: SYSTEM_PROMPT + contextStr },
      ...formatted,
    ],
    max_tokens: 500,
    temperature: 0.7,
  })

  return response.choices[0].message.content
}

export async function getPropertyRecommendation(properties, studentPrefs) {
  const prompt = `Recommend top 3 PGs from this list based on student preferences. Respond only in JSON.

Student: budget ₹${(studentPrefs.maxBudget / 100).toLocaleString('en-IN')}/mo, max ${studentPrefs.maxDistance}km, amenities: ${studentPrefs.amenities?.join(', ') || 'none'}

Properties:
${properties.map((p, i) => `${i + 1}. ${p.name} — ₹${(p.current_price / 100).toLocaleString('en-IN')}/mo, ${p.distance_km}km, Rating: ${p.avg_rating || 'N/A'}`).join('\n')}

JSON format: {"recommendations":[{"property_index":0,"reason":"...","highlight":"..."}],"summary":"..."}`

  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'user', content: prompt }
    ],
    max_tokens: 500,
    temperature: 0.3,
  })

  const text = response.choices[0].message.content
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()) }
  catch { return { recommendations: [], summary: text } }
}