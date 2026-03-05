import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

    try {
        const goal = await prisma.goal.findUnique({
            where: {
                userId_month_year: {
                    userId: session.user.id,
                    month,
                    year,
                },
            },
        })
        return NextResponse.json(goal)
    } catch (error: any) {
        console.error('Goal fetch error:', error.message)
        return NextResponse.json({ error: 'Failed to fetch goal', details: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const json = await request.json()
        const { target, type, month, year } = json

        if (!target || !month || !year) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const goal = await prisma.goal.upsert({
            where: {
                userId_month_year: {
                    userId: session.user.id,
                    month,
                    year,
                },
            },
            update: {
                target: parseInt(target),
                type: type || 'PAGES',
            },
            create: {
                target: parseInt(target),
                type: type || 'PAGES',
                month,
                year,
                userId: session.user.id,
            },
        })

        return NextResponse.json(goal)
    } catch (error: any) {
        console.error('Goal error:', error.message)
        return NextResponse.json({ error: 'Failed to set goal', details: error.message }, { status: 500 })
    }
}

