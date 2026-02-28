import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { awardXpAndCheckAchievements, XP_REWARDS, updateChallengeProgress } from '@/lib/gamification'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const userId = (session.user as { id: string }).id
        const sessions = await prisma.readingSession.findMany({
            where: { userId: userId },
            orderBy: { date: 'desc' },
            take: 20,
            include: { book: { select: { title: true } } },
        })
        return NextResponse.json(sessions)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const json = await request.json()
        const { bookId, pagesRead, duration, date } = json

        if (!bookId || !pagesRead) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const userId = (session.user as { id: string }).id
        const book = await prisma.book.findUnique({
            where: { id: bookId, userId: userId }
        })
        if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

        const sessionEntry = await prisma.readingSession.create({
            data: {
                bookId,
                pagesRead: parseInt(pagesRead),
                duration: duration ? parseInt(duration) : null,
                date: date ? new Date(date) : new Date(),
                userId: userId,
            },
        })

        const newCurrentPage = Math.min(book.totalPages, book.currentPage + parseInt(pagesRead))
        const autoCompleted = newCurrentPage >= book.totalPages
        const newStatus = autoCompleted ? 'COMPLETED' : 'READING'

        await prisma.book.update({
            where: { id: bookId },
            data: { currentPage: newCurrentPage, status: newStatus },
        })

        // Count total sessions for achievement check
        const sessionCount = await prisma.readingSession.count({ where: { userId: userId } })

        // Calculate streak for achievement check
        const allSessions = await prisma.readingSession.findMany({
            where: { userId: userId },
            orderBy: { date: 'desc' },
            take: 30,
        })
        const now = new Date()
        let streak = 0
        for (let i = 0; i < 30; i++) {
            const day = new Date(now)
            day.setDate(now.getDate() - i)
            const hasSession = allSessions.some((s: { date: Date | string }) => new Date(s.date).toDateString() === day.toDateString())
            if (hasSession) streak++
            else break
        }

        // Award XP and check achievements
        const { newXp, newLevel, newAchievements } = await awardXpAndCheckAchievements(
            session.user.id,
            XP_REWARDS.SESSION_LOGGED,
            {
                pagesRead: parseInt(pagesRead),
                bookCompleted: autoCompleted,
                streak,
                sessionCount,
            }
        )

        const challengeNotifications = await updateChallengeProgress(session.user.id, {
            pagesRead: parseInt(pagesRead),
            streak
        })

        return NextResponse.json({
            ...sessionEntry,
            bookTitle: book.title,
            autoCompleted,
            xpGained: newXp,
            newLevel,
            newAchievements,
            challengeNotifications,
        })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Failed to log session' }, { status: 500 })
    }
}
