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
    { title: "The Psychology of Money", author: "Morgan Housel", description: "Timeless lessons on wealth, greed, and happiness — told through 19 short stories. Life-changing in under 250 pages.", totalPages: 242 },
    { title: "Ikigai", author: "Héctor García", description: "The Japanese secret to a long and happy life. A beautiful, quick read that reframes how you see purpose.", totalPages: 208 },
    { title: "Man's Search for Meaning", author: "Viktor Frankl", description: "A Holocaust survivor's account of finding purpose even in the darkest conditions. One of the most powerful books ever written.", totalPages: 165 },
    { title: "The 48 Laws of Power", author: "Robert Greene", description: "Distilled wisdom from history's most cunning strategists and thinkers. Essential for understanding human dynamics.", totalPages: 452 },
    { title: "Start with Why", author: "Simon Sinek", description: "Why do some leaders inspire while others don't? Sinek reveals the simple pattern that separates great leaders from the rest.", totalPages: 256 },
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

        const { recentlyReadBooks, seenTitles, mood } = await req.json()
        
        let contextText = ''
        if (recentlyReadBooks && recentlyReadBooks.length > 0) {
            contextText = `The user recently read and completed these books: ${recentlyReadBooks.map((b: any) => b.title).join(', ')}.`
        } else {
            contextText = 'The user is new and looking for highly-rated popular books to kickstart their reading habit.'
        }

        const avoidText = seenTitles && seenTitles.length > 0
            ? `\nDo NOT recommend any of these books the user has already seen: ${seenTitles.join(', ')}.`
            : ''

        const moodInstructions: Record<string, string> = {
            'light':       'The user wants something Light & Fun — pick entertaining, humorous, or feel-good books. Avoid dense or heavy topics.',
            'mind':        'The user wants Mind-Expanding reads — pick dense non-fiction, philosophy, neuroscience, or big-idea books.',
            'ambitious':   'The user is feeling Ambitious — pick books on business, productivity, habits, or building great things.',
            'calm':        'The user wants something Calm & Mindful — pick wellness, nature writing, gentle memoirs, or slow literary fiction.',
            'adventure':   'The user craves Adventure — pick thrillers, travel narratives, epic fantasy, or survival stories.',
            'emotional':   'The user is in an Emotional mood — pick moving memoirs, character-driven literary fiction, or deeply human stories.',
            'bedtime':     'The user wants an Easy Bedtime Read — short chapters, low-intensity, novellas, or gentle page-turners.',
            'career':      'The user is focused on Career Growth — pick leadership, finance, entrepreneurship, or professional skill books.',
            'thoughtful':  'The user wants something Thought-Provoking — pick speculative fiction, ethical dilemmas, future-thinking, or big philosophical questions.',
        }
        const moodText = mood && moodInstructions[mood]
            ? `\n\nMOOD DIRECTIVE (high priority): ${moodInstructions[mood]} Blend this with the user's history where possible, but mood takes priority.`
            : ''

        const prompt = `
You are an expert reading recommender for a gamified reading app.
${contextText}${avoidText}${moodText}

Generate 10 personalized book recommendations for this user. Avoid books they have already read.
Return the result strictly as a JSON array of objects, with no markdown formatting or extra text.
Each object must have the following exact schema:
{
  "title": "Book Title",
  "author": "Author Name",
  "description": "A catchy, 2-sentence pitch explaining WHY they will love it based on their history and current mood.",
  "totalPages": 350
}
`

        try {
            const aiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
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
