import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// ── In-memory cache: key = "title::author", value = { text, expiresAt }
const summaryCache = new Map<string, { text: string; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { title, author } = await req.json()

        if (!title || !author) {
            return NextResponse.json({ error: 'Missing title or author' }, { status: 400 })
        }

        // ── Check cache first
        const cacheKey = `${title}::${author}`.toLowerCase()
        const cached = summaryCache.get(cacheKey)
        if (cached && cached.expiresAt > Date.now()) {
            console.log(`[Summary Cache HIT] ${cacheKey}`)
            const encoder = new TextEncoder()
            // Stream cached text in chunks for consistent UX
            const stream = new ReadableStream({
                async start(controller) {
                    const words = cached.text.split(' ')
                    for (let i = 0; i < words.length; i += 10) {
                        controller.enqueue(encoder.encode(words.slice(i, i + 10).join(' ') + ' '))
                        await new Promise(r => setTimeout(r, 15)) // slight delay for streaming feel
                    }
                    controller.close()
                }
            })
            return new Response(stream, {
                headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Cache': 'HIT' }
            })
        }

        const prompt = `
You are an expert literary synthesizer and habit-building coach.
Generate a captivating, engaging 15-minute read summary (about 1200-1500 words) for the book "${title}" by ${author}.
This should feel like a premium, insightful masterclass that inspires the reader.

Structure the response beautifully using Markdown spacing:

## 🌟 The Core Premise
(A compelling hook and high-level summary of the book's main argument or narrative)

## 🔑 Key Ideas & Takeaways
(3-4 bullet points detailing the absolute most powerful insights from the text with short explanations)

## 📖 Deeper Dive
(A rich summary of the narrative arc or the logical progression of the chapters. Don't simply list facts; tell a story that captures the essence of the book.)

## 🚀 Actionable Insights
(How the reader can apply the lessons from this book to their own life today.)

Write directly to the user in a motivational, intelligent tone.
`

        const aiModel = genAI.getGenerativeModel({ model: 'gemini-3.0-flash' })
        const result = await aiModel.generateContentStream(prompt)

        const encoder = new TextEncoder()
        let fullText = ''

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text()
                        if (chunkText) {
                            fullText += chunkText
                            controller.enqueue(encoder.encode(chunkText))
                        }
                    }
                    controller.close()
                    // Save to cache after full generation
                    summaryCache.set(cacheKey, { text: fullText, expiresAt: Date.now() + CACHE_TTL_MS })
                    console.log(`[Summary Cache SET] ${cacheKey}`)
                } catch (error) {
                    controller.error(error)
                }
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'X-Cache': 'MISS',
            },
        })

    } catch (error: any) {
        console.error('Summary API Error:', error)

        // ── Detect quota/rate limit errors and return structured 429
        const msg: string = error?.message || ''
        const is429 = msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests')
        const retryMatch = msg.match(/retryDelay["']?\s*:\s*["']?(\d+)/)
        const retryAfter = retryMatch ? parseInt(retryMatch[1]) : 60

        if (is429) {
            return NextResponse.json({
                error: 'quota_exceeded',
                retryAfter,
                message: `Buddy is taking a quick breather. Try again in ${retryAfter} seconds.`
            }, { status: 429 })
        }

        return NextResponse.json({ error: 'Failed to generate summary', details: error.message }, { status: 500 })
    }
}

