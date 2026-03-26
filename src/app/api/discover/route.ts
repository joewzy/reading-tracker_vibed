import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

        const aiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const aiResponse = await aiModel.generateContent(prompt)
        const textResponse = aiResponse.response.text()
        
        // Strip markdown if AI included it
        const jsonStr = textResponse.replace(/```json/g, '').replace(/```/g, '').trim()
        const recommendations = JSON.parse(jsonStr)

        return NextResponse.json({ recommendations })
    } catch (error: any) {
        console.error('Discover API Error:', error)
        return NextResponse.json({ error: 'Failed to generate recommendations', details: error.message }, { status: 500 })
    }
}
