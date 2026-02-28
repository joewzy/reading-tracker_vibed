import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { startOfDay, subDays, format, isSameDay } from 'date-fns'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const userId = (session.user as { id: string }).id
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { streakFreezes: true }
        })

        const sessions = await prisma.readingSession.findMany({
            where: { userId: userId },
            orderBy: { date: 'asc' },
            include: { book: true }
        })

        // Calculate Streak
        let currentStreak = 0
        let availableFreezes = user?.streakFreezes || 0
        let freezesConsumed = 0
        const today = startOfDay(new Date())

        // Get unique days with reading activity
        const readingDays = Array.from(new Set(sessions.map((s: { date: string | Date, duration?: number | null, pagesRead?: number }) => startOfDay(new Date(s.date)).getTime())))
            .sort((a: number, b: number) => b - a) // Recent first

        if (readingDays.length > 0) {
            const mostRecentReadingDay = new Date(readingDays[0] as number)
            let diffToToday = Math.floor((today.getTime() - mostRecentReadingDay.getTime()) / (1000 * 60 * 60 * 24))

            // Check if streak is broken but can be saved by freezes
            while (diffToToday > 1 && availableFreezes > 0) {
                availableFreezes--
                freezesConsumed++
                diffToToday--
            }

            if (diffToToday <= 1) { // User read today/yesterday or saved by freeze
                currentStreak = 1
                for (let i = 0; i < readingDays.length - 1; i++) {
                    const current = new Date(readingDays[i] as number)
                    const next = new Date(readingDays[i + 1] as number)
                    let diff = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24))

                    while (diff > 1 && availableFreezes > 0) {
                        availableFreezes--
                        freezesConsumed++
                        diff--
                        currentStreak++ // Add the "bridged" day
                    }

                    if (diff <= 1) {
                        currentStreak++
                    } else {
                        break
                    }
                }
            }
        }

        // If freezes were consumed, persist the change
        if (freezesConsumed > 0) {
            await prisma.user.update({
                where: { id: userId },
                data: { streakFreezes: { decrement: freezesConsumed } }
            })
        }

        // Prepare chart data (Last 7 days)
        const chartData = []
        for (let i = 6; i >= 0; i--) {
            const day = subDays(today, i)
            const dayStr = format(day, 'MMM dd')
            const daySessions = sessions.filter((s) => isSameDay(new Date(s.date), day))
            const pagesRead = daySessions.reduce((acc, s) => acc + s.pagesRead, 0)

            chartData.push({
                name: dayStr,
                pages: pagesRead,
            })
        }

        // Calculate Reading Speed (PPH - Pages Per Hour)
        const sessionsWithDuration = sessions.filter((s) => s.duration && s.duration > 0)
        let averagePPH = 0
        if (sessionsWithDuration.length > 0) {
            const totalPages = sessionsWithDuration.reduce((acc, s) => acc + s.pagesRead, 0)
            const totalMinutes = sessionsWithDuration.reduce((acc, s) => acc + (s.duration || 0), 0)
            averagePPH = Math.round((totalPages / (totalMinutes / 60)))
        }

        return NextResponse.json({
            streak: currentStreak,
            chartData,
            averagePPH,
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 })
    }
}
