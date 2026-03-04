import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// One-time seed route: POST /api/seed/challenges
// Protected by a secret token - call with: ?token=YOUR_SEED_TOKEN
export async function POST(request: Request) {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (token !== process.env.SEED_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const nextMonth = new Date(now)
    nextMonth.setMonth(now.getMonth() + 1)

    const challenges = [
        {
            title: 'Weekend Warrior',
            description: 'Read at least 50 pages over the weekend.',
            type: 'TOTAL_PAGES',
            target: 50,
            xpReward: 200,
            startDate: now,
            endDate: nextMonth,
        },
        {
            title: 'Daily Devotion',
            description: 'Build a 7-day reading streak this month.',
            type: 'STREAK',
            target: 7,
            xpReward: 350,
            startDate: now,
            endDate: nextMonth,
        },
        {
            title: 'Page Turner',
            description: 'Read 500 pages in a single month.',
            type: 'TOTAL_PAGES',
            target: 500,
            xpReward: 500,
            startDate: now,
            endDate: nextMonth,
        },
        {
            title: 'Speed Reader',
            description: 'Log at least 30 pages in a single day.',
            type: 'PAGES_DAILY',
            target: 30,
            xpReward: 150,
            startDate: now,
            endDate: nextMonth,
        },
        {
            title: 'Iron Reader',
            description: 'Maintain a 30-day reading streak.',
            type: 'STREAK',
            target: 30,
            xpReward: 1000,
            startDate: now,
            endDate: nextMonth,
        },
        {
            title: 'Century Club',
            description: 'Read 100 pages in a single day.',
            type: 'PAGES_DAILY',
            target: 100,
            xpReward: 400,
            startDate: now,
            endDate: nextMonth,
        },
    ]

    try {
        // Clear existing challenges to avoid duplicates
        await prisma.challenge.deleteMany({})

        // Create all challenges
        const created = await prisma.challenge.createMany({ data: challenges })

        return NextResponse.json({
            message: `Successfully seeded ${created.count} challenges!`,
            count: created.count,
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
