import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookId, message, context } = await JSON.parse(await request.text())
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
        return NextResponse.json({ error: 'AI Buddy is currently resting (API key missing)' }, { status: 503 })
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        // Fetch user's notes for this book to provide context
        const userNotes = await prisma.note.findMany({
            where: { bookId, user: { email: session.user.email } },
            orderBy: { createdAt: 'desc' },
            take: 10
        })

        const notesContext = userNotes.map((n: { content: string }) => n.content).join('\n---\n')

        const prompt = `You are the "Reading Buddy" for ReaderVerse, a gamified reading sanctuary.
User is reading: ${context.bookTitle} by ${context.bookAuthor}.
User's recent notes on this book:
${notesContext || 'No notes yet.'}

User message: ${message}

Instructions:
- Be encouraging, slightly scholarly, and zen-minimalist in your persona.
- Use the user's notes to answer questions or provide insights.
- If they ask for a summary, provide a concise, high-level overview.
- Keep responses relatively brief (max 3 paragraphs).
- Use clear markdown formatting.`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        return NextResponse.json({ text })
    } catch (error) {
        console.error('AI Buddy Error:', error)
        return NextResponse.json({ error: 'Buddy had a bit of a brain freeze. Try again?' }, { status: 500 })
    }
}
