import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const SYSTEM_PROMPT = `You are RentBot, an AI assistant for RentEase — a smart student accommodation platform in India.
You help students with: finding the best PG based on budget and distance, comparing properties, explaining rent/electricity bills, navigating the dashboard, understanding payment schedules, referral programs, and raising disputes.
Guidelines: Be friendly and concise. Use Indian context (₹, Indian cities). Keep responses under 200 words unless detail is needed. Use emojis occasionally.`

export async function chatWithGemini(messages, userContext = {}) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const contextStr = userContext.enrollment
    ? `\nUser context: Student at ${userContext.enrollment.property_name}, paying ₹${(userContext.enrollment.monthly_rent/100).toLocaleString('en-IN')}/month`
    : ''
  const chat = model.startChat({
    history: messages.slice(0,-1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    systemInstruction: SYSTEM_PROMPT + contextStr,
    generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
  })
  const result = await chat.sendMessage(messages[messages.length-1].content)
  return result.response.text()
}

export async function getPropertyRecommendation(properties, studentPrefs) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const prompt = `Recommend top 3 PGs from this list based on student preferences. Respond only in JSON.

Student: budget ₹${(studentPrefs.maxBudget/100).toLocaleString('en-IN')}/mo, max ${studentPrefs.maxDistance}km, amenities: ${studentPrefs.amenities?.join(', ')||'none'}

Properties:
${properties.map((p,i) => `${i+1}. ${p.name} — ₹${(p.current_price/100).toLocaleString('en-IN')}/mo, ${p.distance_km}km, Rating: ${p.avg_rating||'N/A'}`).join('\n')}

JSON format: {"recommendations":[{"property_index":0,"reason":"...","highlight":"..."}],"summary":"..."}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  try { return JSON.parse(text.replace(/```json|```/g,'').trim()) }
  catch { return { recommendations: [], summary: text } }
}