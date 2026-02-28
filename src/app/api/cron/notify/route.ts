import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendMorningEmail, sendEveningEmail } from '@/lib/email'

// Called by the cron scheduler in server.js
// Also callable manually via POST /api/cron/notify?type=morning|evening
export async function POST(request: Request) {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'morning'

    try {
        const users = await prisma.user.findMany({
            where: { notificationEmail: { not: null } },
            include: {
                books: true,
                ReadingSession: {
                    where: { date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
                },
            },
        })

        const results: string[] = []

        for (const user of users) {
            if (!user.notificationEmail) continue
            const name = user.name || 'Reader'

            // Calculate streak
            const now = new Date()
            let streak = 0
            for (let i = 0; i < 30; i++) {
                const day = new Date(now)
                day.setDate(now.getDate() - i)
                const dayStr = day.toDateString()
                const hasSession = user.ReadingSession.some(s => new Date(s.date).toDateString() === dayStr)
                if (hasSession) streak++
                else break
            }

            const pagesThisMonth = user.ReadingSession.reduce((acc, s) => acc + s.pagesRead, 0)

            try {
                if (type === 'morning') {
                    await sendMorningEmail(user.notificationEmail, name, streak, user.books.length)
                } else {
                    await sendEveningEmail(user.notificationEmail, name, streak, pagesThisMonth)
                }
                results.push(`✓ ${user.notificationEmail}`)
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err)
                results.push(`✗ ${user.notificationEmail}: ${message}`)
            }
        }

        return NextResponse.json({ sent: results.length, results })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
