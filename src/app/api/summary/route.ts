import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { title, author } = await req.json()

        if (!title || !author) {
            return NextResponse.json({ error: 'Missing title or author' }, { status: 400 })
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

        const aiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
        const result = await aiModel.generateContentStream(prompt)

        const encoder = new TextEncoder()
        
        // Build a readable stream to pipe to the frontend
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text()
                        if (chunkText) {
                            controller.enqueue(encoder.encode(chunkText))
                        }
                    }
                    controller.close()
                } catch (error) {
                    controller.error(error)
                }
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
            },
        })

    } catch (error: any) {
        console.error('Summary API Error:', error)
        return NextResponse.json({ error: 'Failed to generate summary', details: error.message }, { status: 500 })
    }
}
