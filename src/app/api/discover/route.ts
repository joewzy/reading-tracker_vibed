import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

const FALLBACK_RECOMMENDATIONS = [
    { title: "Atomic Habits", author: "James Clear", description: "Discover the tiny changes that deliver remarkable results. A must-read for anyone trying to build better daily rituals.", totalPages: 320 },
    { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", description: "A Nobel Prize winner reveals the two systems that drive the way we think — and how to make smarter decisions.", totalPages: 499 },
    { title: "The Alchemist", author: "Paulo Coelho", description: "A timeless fable about following your dreams and listening to your heart. One of the best-selling books of all time.", totalPages: 197 },
    { title: "Sapiens", author: "Yuval Noah Harari", description: "A bold retelling of the entire history of humankind. Utterly fascinating and endlessly thought-provoking.", totalPages: 443 },
    { title: "Deep Work", author: "Cal Newport", description: "The superpower of the 21st century, and how to master it. Essential reading for anyone who wants to do their best work.", totalPages: 296 },
]

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // If no API key, return fallback immediately
        if (!process.env.GEMINI_API_KEY) {
            console.warn('GEMINI_API_KEY not set — returning fallback recommendations.')
            return NextResponse.json({ recommendations: FALLBACK_RECOMMENDATIONS })
        }

        const { recentlyReadBooks } = await req.json()
        
        let contextText = ''
        if (recentlyReadBooks && recentlyReadBooks.length > 0) {
            contextText = `The user recently read and completed these books: ${recentlyReadBooks.map((b: any) => b.title).join(', ')}.`
        } else {
            contextText = 'The user is new and looking for highly-rated popular books to kickstart their reading habit.'
        }

        const prompt = `
You are an expert reading recommender for a gamified reading app.
${contextText}

Generate 5 personalized book recommendations for this user. Avoid books they have already read.
Return the result strictly as a JSON array of objects, with no markdown formatting or extra text.
Each object must have the following exact schema:
{
  "title": "Book Title",
  "author": "Author Name",
  "description": "A catchy, 2-sentence pitch explaining WHY they will love it based on their history.",
  "totalPages": 350
}
`

        try {
            const aiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
            const aiResponse = await aiModel.generateContent(prompt)
            const textResponse = aiResponse.response.text()
            
            // Strip markdown if AI included it
            const jsonStr = textResponse.replace(/```json/g, '').replace(/```/g, '').trim()
            const recommendations = JSON.parse(jsonStr)
            return NextResponse.json({ recommendations })
        } catch (aiError: any) {
            console.error('Gemini AI error, using fallback:', aiError.message)
            return NextResponse.json({ recommendations: FALLBACK_RECOMMENDATIONS })
        }

    } catch (error: any) {
        console.error('Discover API Error:', error)
        return NextResponse.json({ recommendations: FALLBACK_RECOMMENDATIONS })
    }
}
